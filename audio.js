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


console.log("Audio Javascript");

const info = document.getElementById("info");
const TDInfo = document.getElementById("TDInfo");
const FDInfo = document.getElementById("FDInfo");

const timeDomainCanvas = document.getElementById('timeDomainGraph');
const timeDomainContext = timeDomainCanvas.getContext('2d');

const FrequencyDomainCanvas = document.getElementById('frequencyDomainGraph');
const FrequencyDomainContext = FrequencyDomainCanvas.getContext('2d');

const audioListen = document.getElementById("audioListen");

const audioStart = document.getElementById("audioStart");
const audioStop = document.getElementById("audioStop");

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

let openSheetMusicDisplayInstance = null; // OSMD instance
let audioContext = null;                  // WebAudio AudioContext
let mediaStreamSourceNode = null;         // MediaStreamAudioSourceNode for mic input
let animationFrameRequestId = null;
let analyserNode = null;                  // WebAudio AnalyserNode used for raw waveform + pitch
// let meydaAnalyzerInstance = null;         // Meyda analyzer
let monitorGainNode = null;
let monitoringEnabled = false;

let freqBinValue = 0;

/**
 * Audio Input and Processing
*/
async function startAudioProcessing() {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false
        }
    });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume().catch(() => { });
    mediaStreamSourceNode = audioContext.createMediaStreamSource(stream);

    analyserNode = audioContext.createAnalyser();

    // Higher the number, the more accurate the result, but in turn, slower
    analyserNode.fftSize = 32768;
    mediaStreamSourceNode.connect(analyserNode);

    // Hz of each bar in freq domain
    freqBinValue = audioContext.sampleRate / analyserNode.fftSize;

    // Display Data in info tag
    info.innerHTML = "<p>Sample Rate = " + audioContext.sampleRate + "</p>" +
        "<p>AudioContext state = " + audioContext.state + "</p>" +
        "<p>FFT Size =" + analyserNode.fftSize + "</p>" +
        "<p>Time Domain Window = " + (analyserNode.fftSize / audioContext.sampleRate).toFixed(4) + " secs</p>" + // fftsize/samplerate = time
        "<p>Freq Bin Value = " + (freqBinValue).toFixed(4) + "Hz per bin</p>"; // samplerate/fftsize = freqBinCount

    monitorGainNode = audioContext.createGain();
    monitorGainNode.gain.value = 0;
    analyserNode.connect(monitorGainNode);
    try { monitorGainNode.connect(audioContext.destination); } catch (e) { console.log("Listen Error"); }

    // // Meyda analyzer for chroma + RMS
    // const meydaBufferSize = 4096;
    // meydaAnalyzerInstance = Meyda.createMeydaAnalyzer({
    //     audioContext: audioContext,
    //     source: mediaStreamSourceNode,
    //     bufferSize: meydaBufferSize,
    //     featureExtractors: ['chroma', 'rms'],
    //     callback: features => onMeydaFeaturesCallback(features)
    // });
    // meydaAnalyzerInstance.start();

    if (!animationFrameRequestId) drawGraphs();

    // Show/Hide Buttons
    audioListen.hidden = false;
    audioStart.hidden = true;
    audioStop.hidden = false;

    console.log("Microphone started");
}

function stopAudioProcessing() {
    // if (meydaAnalyzerInstance) { try { meydaAnalyzerInstance.stop(); } catch (e) { } meydaAnalyzerInstance = null; }
    // if (animationFrameRequestId) { cancelAnimationFrame(animationFrameRequestId); animationFrameRequestId = null; }
    // if (monitorGainNode) { try { monitorGainNode.disconnect(); } catch (e) { } monitorGainNode = null; }
    if (analyserNode) { try { analyserNode.disconnect(); } catch (e) { } analyserNode = null; }
    if (mediaStreamSourceNode) { try { mediaStreamSourceNode.disconnect(); console.log("disconnected"); } catch (e) { console.log("ERR: " + e); } mediaStreamSourceNode = null; console.log("medastreamosurcenode = Null"); }
    if (audioContext) { try { audioContext.close(); } catch (e) { } audioContext = null; }

    // Show/Hide Buttons
    audioStop.hidden = true;
    audioStart.hidden = false;
    audioListen.hidden = true;

    // Display Data in info tag
    info.textContent = "";
    console.log('Microphone stopped');
}

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

/**
 * Audio Visualisation
 * 
 * Time-domain waveform
 */
function drawTimeDoaminGraph() {
    if (!analyserNode) {
        animationFrameRequestId = requestAnimationFrame(drawTimeDoaminGraph);
        return;
    }

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

    // // compute RMS for UI
    // let rms = 0;
    // for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex++) rms += buffer[sampleIndex] * buffer[sampleIndex];
    // rms = Math.sqrt(rms / buffer.length);
    // rmsLabel.textContent = rms.toFixed(3);
    // const rmsPercent = Math.min(1, rms * 5);
    // rmsFillBar.style.width = (rmsPercent * 100) + '%';

    // pitch detection
    // const detectedFrequencyHz = autoCorrelateAndFindFrequency(buffer, audioContext.sampleRate);
    // if (detectedFrequencyHz > 0) detectedFrequencyLabel.textContent = detectedFrequencyHz.toFixed(1);
    // else detectedFrequencyLabel.textContent = '—';
}

/**
 * Frequency Bar Graph
 */
function drawFrequencyDomainGraph() {
    if (!analyserNode) {
        animationFrameRequestId = requestAnimationFrame(drawFrequencyDomainGraph);
        return;
    }

    const buffer = new Uint8Array(analyserNode.frequencyBinCount);
    // Computes fast fourier transform on the buffer
    analyserNode.getByteFrequencyData(buffer);
    const maxMinWIndex = fastMaxMin(buffer);

    // draw frequency domain
    FrequencyDomainContext.fillStyle = '#ffffff';
    FrequencyDomainContext.fillRect(0, 0, FrequencyDomainCanvas.width, FrequencyDomainCanvas.height);
    FrequencyDomainContext.strokeStyle = '#2a6';
    // 2.5 = random bar width multiplier
    const barWidth = (FrequencyDomainCanvas.width / buffer.length) * 2.5;

    // x axis
    let frequency = 0;

    for (let i = 0; i < buffer.length; i++) {
        // y axis
        const barHeight = buffer[i];
        FrequencyDomainContext.fillStyle = 'rgb(' + (barHeight - 50) + ',170, 102)';
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
 * - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
 * - https://stackoverflow.com/questions/14789283/what-does-the-fft-data-in-the-web-audio-api-correspond-to
 * - https://stackoverflow.com/questions/4364823/how-do-i-obtain-the-frequencies-of-each-value-in-an-fft
 * - https://dsp.stackexchange.com/questions/2818/extracting-frequencies-from-fft
 * - https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createGain
 * - https://github.com/DanielJDufour/fast-max/blob/main/index.js
 * - 
 */