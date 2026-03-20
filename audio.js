/**
 * This file focuses on the audio processing
 * It enables the control of the audio accessed by the browser and contains
 * the processing of the input signal into the various graphs
 * 
 * The Time Domain
 * Amplitude / Time where the window is displayed in the info id div
 * This is displayed to show the signal that is being picked up over time
 * 
 * The Frequency Domain 
 * Amplitude / Frequency which contains bars of frequency bins where the 
 * width is calculated as 
 * sample rate / fft size -> 44100 / 4096 as example
 * to get the frequency at each bin, you have to find the width of the fisrt bin
 * and multiply it by the specified bin
 * so if the bin width = 10.77, the freq at bin 20 is 20 * 10.77 = 215.4 which 
 * roughly equates to a frequency bewteen a G#3(207.652) and A3(220)
 */

import { noteNames, freqToNote } from "./helpers.js";

// General and graph Info
const info = document.getElementById("info");
const TDInfo = document.getElementById("TDInfo");
const FDInfo = document.getElementById("FDInfo");

// Time and Freq graphs
const timeDomainCanvas = document.getElementById("timeDomainGraph");
const timeDomainContext = timeDomainCanvas.getContext("2d");

const FrequencyDomainCanvas = document.getElementById("frequencyDomainGraph");
const FrequencyDomainContext = FrequencyDomainCanvas.getContext("2d");

// Audio Chromagram
const audioChromagram = document.getElementById("audioChromagram");

// Audio Control
const audioListen = document.getElementById("audioListen");
const audioStart = document.getElementById("audioStart");
const audioStop = document.getElementById("audioStop");

// Signal Data
const chromaContainer = document.getElementById("chromaContainer");
const rmsValue = document.getElementById("rmsValue");
const meydaRMS = document.getElementById("meydaRmsValue");
const centsValue = document.getElementById("centsValue");
const fundamentalFrequencyValue = document.getElementById("fundaFreqValue");
const frequencyNoteValue = document.getElementById("freqNoteValue");

// let openSheetMusicDisplayInstance = null; // OSMD instance
let audioContext = null;                  // WebAudio AudioContext
let mediaStreamSourceNode = null;         // MediaStreamAudioSourceNode for mic input
let animationFrameRequestId = null;       // Allow for graphing
let analyserNode = null;                  // WebAudio AnalyserNode used for raw waveform + pitch
let meydaAnalyzer = null;                 // Meyda analyzer
let monitorGainNode = null;               // Gain for live audio playback 
let monitoringEnabled = false;            // Toggle for audio playback

let audioChromaDisplayed = false;         // Only load the audio chroma boxes once 

let freqBinValue = 0;   // Hz value per freq bin 

audioListen.onclick = () => {
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
};

audioStart.onclick = () => startAudioProcessing();
audioStop.onclick = () => stopAudioProcessing();

/*
 * Helper Methods
 */
// Based on DanielJDufour fast-max method
function fastMaxMin(array) {
    let max = array[0];
    let min = array[0];

    let maxIndex = 0;
    let minIndex = 0;

    for (let i = 1; i < array.length; i++) {
        const value = array[i];
        if (value > max) {
            max = value;
            maxIndex = i;
            if (max === 255) break;
        }
        if (value < min) {
            min = value;
            minIndex = i;
            if (min === 255) break;
        }
    }

    return { max, min, maxIndex, minIndex }
}

function updateChromaColors(values) {
    const boxes = document.querySelectorAll('.chromaBox');
    boxes.forEach((box, i) => {
        const value = values[i];
        // white = 1, green = 0
        const greenValue = Math.floor(value * 255);
        box.style.backgroundColor = `rgb(${greenValue}, 255, ${greenValue})`;
    });
}

/**
 * Method by cwilso/PitchDetect
 * @param {} buf 
 * @param {int} sampleRate 
 * @returns 
 */
function autoCorrelate(buf, sampleRate) {
    // Implements the ACF2+ algorithm
    var SIZE = buf.length;
    var rms = 0;
    var a, b = 0;

    for (var i = 0; i < SIZE; i++) {
        var val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) // not enough signal
        return -1;

    meydaRMS.textContent = rms.toFixed(4);
    var r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (var i = 0; i < SIZE / 2; i++)
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (var i = 1; i < SIZE / 2; i++)
        if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    var c = new Array(SIZE).fill(0);
    for (var i = 0; i < SIZE; i++)
        for (var j = 0; j < SIZE - i; j++)
            c[i] = c[i] + buf[j] * buf[j + i];

    var d = 0; while (c[d] > c[d + 1]) d++;
    var maxval = -1, maxpos = -1;
    for (var i = d; i < SIZE; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    var T0 = maxpos;

    var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    a = (x1 + x3 - 2 * x2) / 2;
    b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
}


/**
 * Audio Input and Processing
 * Initilises Monitoring, Analysing, UI data
*/
async function startAudioProcessing() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    });

    await audioContext.resume().catch(() => { });
    mediaStreamSourceNode = audioContext.createMediaStreamSource(stream);

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

    // Hz of each bar in freq domain
    freqBinValue = audioContext.sampleRate / analyserNode.fftSize;

    // Display Data in info tag
    info.innerHTML = "<p>Sample Rate = " + audioContext.sampleRate + "</p>" +
        "<p>AudioContext state = " + audioContext.state + "</p>" +
        "<p>FFT Size =" + analyserNode.fftSize + "</p>" +
        "<p>Time Domain Window = " + (analyserNode.fftSize / audioContext.sampleRate).toFixed(4) + " secs</p>" + // fftsize/samplerate = time
        "<p>Freq Bin Value = " + (freqBinValue).toFixed(4) + "Hz per bin</p>"; // samplerate/fftsize = freqBinCount

    if (!audioChromaDisplayed) {
        // Create 12 boxes for each chroma note
        for (let i = 0; i < 12; i++) {
            const chromaBox = document.createElement('div');
            chromaBox.classList.add('chromaBox');
            chromaBox.textContent = noteNames[i];
            chromaContainer.appendChild(chromaBox);
        }
        audioChromaDisplayed = true;
    }

    // Meyda analyzer for chroma + RMS
    const meydaBufferSize = 1024;
    meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioContext,
        source: mediaStreamSourceNode,
        bufferSize: meydaBufferSize,
        featureExtractors: ['chroma', 'rms'],
        callback: onMeydaFeaturesCallback
        // callback: features => {
        //     console.log(features);
        // }
    });
    meydaAnalyzer.start();

    if (!animationFrameRequestId) drawGraphs();

    // Show/Hide Buttons
    audioListen.hidden = false;
    audioStart.hidden = true;
    audioStop.hidden = false;

    console.log("[LOG] Microphone started");
}

/**
 * Stops all audio related functions
 */
function stopAudioProcessing() {
    if (meydaAnalyzer) {
        try {
            meydaAnalyzer.stop();
            meydaAnalyzer = null;
        } catch (e) { } 
    }
    if (animationFrameRequestId) {
        try{
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
    audioStop.hidden = true;
    audioStart.hidden = false;
    audioListen.hidden = true;

    // Display Data in info tag
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
    updateChromaColors(chromaValues);

    let rms = features.rms
    if (rms < 0.01) {
        return -1;
    }
    rmsValue.textContent = rms.toFixed(4);

    // Initial update


    // chromaValues.forEach(element => {
    //     console.log(element);
    // });

    // console.log("[MEYDA] features: " + features.chroma);
}


/*
 * Audio Visualisation
 */
/** 
 * Time-domain waveform
 */
function drawTimeDoaminGraph() {
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

    TDInfo.innerHTML = "<h4>Amplitude</h4><p>Max Amp = " + maxMinWIndex.max.toFixed(4) + "</p>" + "<p>Min Amp = " + maxMinWIndex.min.toFixed(4) + "</p>";


    // Pitch Detection
    const detectedFrequencyHz = autoCorrelate(buffer, audioContext.sampleRate);
    if (detectedFrequencyHz > 0) {
        fundamentalFrequencyValue.textContent = detectedFrequencyHz.toFixed(1);
        frequencyNoteValue.textContent = freqToNote(detectedFrequencyHz);
    } else {
        fundamentalFrequencyValue.textContent = '-';
        frequencyNoteValue.textContent = '-';
    }
}

/**
 * Frequency Bar Graph
 */
function drawFrequencyDomainGraph() {
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

    FDInfo.innerHTML = "<h4>Amplitude</h4><p>Max Amp = " + maxMinWIndex.max + "</p>" +
        "<p>Peak Frequency = " + maxMinWIndex.maxIndex * freqBinValue + "Hz</p>";

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
 * -
 */