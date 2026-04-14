/**
 * This file focuses on the audio processing
 * It enables the control of the audio accessed by the browser and contains
 * the processing of the input signal into the domain graphs
 */

import { compareNotes } from "/controller/compare.js";
import { calulateCents, fastMaxMin } from "/controller/helpers.js"
import { values } from "/model/values.js";
import { getExpectedNotes, osmd } from "/controller/score/osmdController.js";
import { updateChromaColors, updateMeydaRMS, updateAudioControlButtons, updateSignalData, updateInfoVisibility } from "/view/ui.js";

// let openSheetMusicDisplayInstance = null; // OSMD instance
let audioContext = null;                  // WebAudio AudioContext
let mediaStreamSourceNode = null;         // MediaStreamAudioSourceNode for mic input
let animationFrameRequestId = null;       // Allow for graphing
let analyserNode = null;                  // WebAudio AnalyserNode used for raw waveform + pitch
let meydaAnalyzer = null;                 // Meyda analyzer
let monitorGainNode = null;               // Gain for live audio playback 
let monitoringEnabled = false;            // Toggle for audio playback

let freqBinValue = 0;   // Hz value per freq bin 
let consecutiveMatches = 0;

export function toggleAudioListen(audioListen) {
    if (!monitorGainNode) return;

    monitoringEnabled = !monitoringEnabled;

    if (monitoringEnabled) {
        monitorGainNode.gain.value = 1;
        audioListen.style.backgroundColor = "green";
        console.log("Monitoring ON");
    } else {
        monitorGainNode.gain.value = 0;
        audioListen.style.backgroundColor = "maroon";
        console.log("Monitoring OFF");
    }
}

/**
 * Audio Input and Processing
 * Initilises Monitoring, Analysing, UI data
*/
export async function startAudioProcessing() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    await audioContext.audioWorklet.addModule("/controller/audio/audioProcessor.js")
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    });

    await audioContext.resume().catch(() => { });
    mediaStreamSourceNode = audioContext.createMediaStreamSource(stream);

    // Worklet
    const workletNode = new AudioWorkletNode(audioContext, "audio-processor");
    mediaStreamSourceNode.connect(workletNode);

    // Monitoring
    monitorGainNode = audioContext.createGain();
    monitorGainNode.gain.value = 0;

    // Analysing
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;

    // Connecting
    mediaStreamSourceNode.connect(monitorGainNode);
    monitorGainNode.connect(audioContext.destination);
    mediaStreamSourceNode.connect(analyserNode);

    workletNode.port.onmessage = (event) => {
        const { frequency, rms } = event.data;

        if (frequency > -1) {
            if (frequency < 25 || frequency > 4300) { // A pianos range (which includes the guitar) is between 27.5 - 4186.009Hz based on the frequencies of Ab0 to C8
                values.audio.frequency = 0;
                values.audio.rms = rms;
                values.audio.cents = 0;
            } else {
                values.audio.frequency = frequency;
                values.audio.rms = rms;
                values.audio.cents = calulateCents(frequency).cents;
            }
        }

        let compareNotesData = compareNotes();
        if (values.score.expectedFreqs.length === 0) {
            console.log("[SKIP] Rest");
            osmd.cursor.next();
            getExpectedNotes();
        } else if (compareNotesData.result) {
            consecutiveMatches++;
            if (consecutiveMatches >= 3) { // 3 are the expected matches of the audio to the score so it doesnt accidently update ntoe as often
                // console.log("[COMPARE] Match");
                console.log(
                    `[DTW] method=${compareNotesData.method} | dist=${compareNotesData.dist.toFixed(3)} | norm=${compareNotesData.norm.toFixed(3)} | threshold=${compareNotesData.threshold} | consecutiveMatches=${consecutiveMatches}`
                );

                osmd.cursor.next();
                getExpectedNotes();
                consecutiveMatches = 0;
            }
        } else {
            consecutiveMatches = 0;
        }

        updateSignalData({ frequency: values.audio.frequency, rms: values.audio.rms, cents: values.audio.cents });
    }

    // Hz of each bar in freq domain
    freqBinValue = audioContext.sampleRate / analyserNode.fftSize;

    // Display Data in info tag
    const info = document.getElementById("info");
    info.innerHTML = "<p>Sample Rate = " + audioContext.sampleRate + "</p>" +
        "<p>AudioContext state = " + audioContext.state + "</p>" +
        "<p>FFT Size =" + analyserNode.fftSize + "</p>" +
        "<p>Time Domain Window = " + (analyserNode.fftSize / audioContext.sampleRate).toFixed(4) + " secs</p>" + // fftsize/samplerate = time
        "<p>Freq Bin Value = " + (freqBinValue).toFixed(4) + "Hz per bin</p>"; // samplerate/fftsize = freqBinCount


    // Meyda analyzer for chroma + RMS
    const meydaBufferSize = 1024;
    meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioContext,
        source: mediaStreamSourceNode,
        bufferSize: meydaBufferSize,
        featureExtractors: ['chroma', 'rms'],
        callback: onMeydaFeaturesCallback
    });
    meydaAnalyzer.start();

    if (!animationFrameRequestId) drawGraphs();

    updateAudioControlButtons(true);

    console.log("[LOG] Microphone started");
}

/**
 * Stops all audio related functions
*/
export function stopAudioProcessing() {
    if (meydaAnalyzer) {
        try {
            meydaAnalyzer.stop();
            meydaAnalyzer = null;
        } catch (e) { }
    }
    if (animationFrameRequestId) {
        try {
            cancelAnimationFrame(animationFrameRequestId);
            animationFrameRequestId = null;
        } catch (e) { }
    }
    if (monitorGainNode) {
        try {
            monitorGainNode.disconnect();
            monitorGainNode = null;
        } catch (e) { }
    }
    if (analyserNode) {
        try {
            analyserNode.disconnect();
            analyserNode = null;
        } catch (e) { }
    }
    if (mediaStreamSourceNode) {
        try {
            mediaStreamSourceNode.disconnect();
            mediaStreamSourceNode = null;
        } catch (e) { }
    }
    if (audioContext) {
        try {
            audioContext.close();
            audioContext = null;
        } catch (e) { }
    }

    // Show/Hide Buttons
    updateAudioControlButtons(false);

    // Display Data in info tag
    const info = document.getElementById("info");
    info.textContent = "";
    console.log("[LOG] Microphone stopped");
}

/**
 * Callback method for meyda analyser for the signal features
 * @param {Object} features 
 * @returns audio feature data, incl. audio chroma values
 */
function onMeydaFeaturesCallback(features) {
    // Chroma values represent the strength of the values per note 
    // in an array of 12 note western scale
    const chromaValues = features.chroma;

    values.audio.chroma = chromaValues;
    values.audio.chromaValues.push(chromaValues);

    // keep a short rolling window
    if (values.audio.chromaValues.length > 16) { // 16 is a random estimated number 
        values.audio.chromaValues.shift(); // Remove oldest chroma history
    }
    updateChromaColors(chromaValues);

    let rms = features.rms
    if (rms <= 0.01) {
        return -1;
    }
    updateMeydaRMS(rms);
}


/*
 * Audio Visualisation
 */
/** 
 * Time-domain waveform
 */
function drawTimeDoaminGraph() {
    const timeDomainCanvas = document.getElementById("timeDomainGraph");
    const timeDomainContext = timeDomainCanvas.getContext("2d");

    if (!analyserNode) {
        animationFrameRequestId = requestAnimationFrame(drawTimeDoaminGraph);
        return;
    }

    // segments of amplitude over time
    const buffer = new Float32Array(analyserNode.fftSize);

    analyserNode.getFloatTimeDomainData(buffer);
    const maxMinWIndex = fastMaxMin(buffer);

    // draw time domain
    timeDomainContext.fillStyle = '#ffffff';
    timeDomainContext.fillRect(0, 0, timeDomainCanvas.width, timeDomainCanvas.height);
    timeDomainContext.lineWidth = 1;
    timeDomainContext.strokeStyle = '#2a6';
    timeDomainContext.beginPath();
    const midY = timeDomainCanvas.height / 2;
    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex++) {
        // x axis
        const time = sampleIndex / buffer.length * timeDomainCanvas.width;
        // y axis
        const amplitude = midY + buffer[sampleIndex] * midY * 0.9;
        if (sampleIndex === 0) timeDomainContext.moveTo(time, amplitude);
        else timeDomainContext.lineTo(time, amplitude);
    }
    timeDomainContext.stroke();

    // const TDInfo = document.getElementById("TDInfo");
    // TDInfo.innerHTML = "<h4>Amplitude</h4><p>Max Amp = " + maxMinWIndex.max.toFixed(4) + "</p>" + "<p>Min Amp = " + maxMinWIndex.min.toFixed(4) + "</p>";
}

/**
 * Frequency Bar Graph
 */
function drawFrequencyDomainGraph() {
    const FrequencyDomainCanvas = document.getElementById("frequencyDomainGraph");
    const FrequencyDomainContext = FrequencyDomainCanvas.getContext("2d");

    if (!analyserNode) {
        animationFrameRequestId = requestAnimationFrame(drawFrequencyDomainGraph);
        return;
    }
    // segments of amplitude over enegry
    const buffer = new Uint8Array(analyserNode.frequencyBinCount);

    // Computes fast fourier transform on the buffer
    analyserNode.getByteFrequencyData(buffer);
    const maxMinWIndex = fastMaxMin(buffer);

    // draw frequency domain
    FrequencyDomainContext.fillStyle = '#ffffff';
    FrequencyDomainContext.fillRect(0, 0, FrequencyDomainCanvas.width, FrequencyDomainCanvas.height);
    FrequencyDomainContext.strokeStyle = 'rgb(0, 170, 0)';
    // 2.5 = random bar width multiplier
    const barWidth = (FrequencyDomainCanvas.width / buffer.length) * 2.5;

    // x axis
    let frequency = 0;

    for (let i = 0; i < buffer.length; i++) {
        // y axis
        const barHeight = buffer[i];
        // FrequencyDomainContext.fillStyle = 'rgb(' + (barHeight - 50) + ',170, 0)';
        FrequencyDomainContext.fillStyle = 'rgb(0, 170, 0)';
        FrequencyDomainContext.fillRect(
            frequency,
            FrequencyDomainCanvas.height - barHeight / 2,
            barWidth,
            barHeight / 2
        );
        frequency += barWidth + 1;
    }

    // const FDInfo = document.getElementById("FDInfo");
    // FDInfo.innerHTML = "<h4>Amplitude</h4><p>Max Amp = " + maxMinWIndex.max + "</p>" +
    //     "<p>Peak Frequency = " + maxMinWIndex.maxIndex * freqBinValue + "Hz</p>";

}

function drawGraphs() {
    drawTimeDoaminGraph();
    drawFrequencyDomainGraph();
    animationFrameRequestId = requestAnimationFrame(drawGraphs);
}

/**
 * References:
 * - https://www.w3schools.com/html/html5_canvas.asp
 * - https://stackoverflow.com/questions/39302814/mediastream-capture-canvas-and-audio-simultaneously
 * - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
 * - https://stackoverflow.com/questions/14789283/what-does-the-fft-data-in-the-web-audio-api-correspond-to
 * - https://stackoverflow.com/questions/4364823/how-do-i-obtain-the-frequencies-of-each-value-in-an-fft
 * - https://dsp.stackexchange.com/questions/2818/extracting-frequencies-from-fft
 * - https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createGain
 * - https://github.com/DanielJDufour/fast-max/blob/main/index.js
 **- Auto-Correlation: Musical Examination to Bridge Audio Data and Sheet Music (Paper)
    - The only code implementation I can find based on the paper: https://github.com/cwilso/PitchDetect/blob/main/js/pitchdetect.js
 * - https://dsp.stackexchange.com/questions/386/autocorrelation-in-audio-analysis
 * - https://observablehq.com/@cimi/meyda-analyzer#micAnalyzer
 * - https://meyda.js.org/guides/online-web-audio.html
 * - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
 * - https://sengpielaudio.com/calculator-centsratio.htm
 * - https://digitalpiano.app/piano-key-frequencies/
 */