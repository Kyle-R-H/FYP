console.log("Audio Javascript");

const info = document.getElementById("info");

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


/**
 * Audio Input and Processing
*/
async function startAudioProcessing() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume().catch(() => { });
    mediaStreamSourceNode = audioContext.createMediaStreamSource(stream);

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 4096;
    mediaStreamSourceNode.connect(analyserNode);

    // Display Data in info tag
    info.innerHTML = "<p>Sample Rate = " + audioContext.sampleRate + "</p>" +
        "<p>AudioContext state = " + audioContext.state + "</p>" +
        "<p>FFT Size =" + analyserNode.fftSize + "</p>" +
        "<p>Time Domain Window = " + (analyserNode.fftSize/audioContext.sampleRate).toFixed(4) + " secs</p>"; // fftsize/samplerate = time

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
    info.innerHTML = "";
    console.log('Microphone stopped');
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
    // console.log("Buffer\nAs String" + buffer.toString());

    // draw time-domain waveform
    timeDomainContext.fillStyle = '#ffffff';
    timeDomainContext.fillRect(0, 0, timeDomainCanvas.width, timeDomainCanvas.height);
    timeDomainContext.lineWidth = 1;
    timeDomainContext.strokeStyle = '#2a6';
    timeDomainContext.beginPath();
    const midY = timeDomainCanvas.height / 2;
    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex++) {
        const x = sampleIndex / buffer.length * timeDomainCanvas.width;
        const y = midY + buffer[sampleIndex] * midY * 0.9;
        if (sampleIndex === 0) timeDomainContext.moveTo(x, y);
        else timeDomainContext.lineTo(x, y);
    }
    timeDomainContext.stroke();

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

    animationFrameRequestId = requestAnimationFrame(drawTimeDoaminGraph);
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
    analyserNode.getByteFrequencyData(buffer);
    // console.log("Buffer\nAs String" + buffer.toString());

    // draw time-domain waveform
    FrequencyDomainContext.fillStyle = '#ffffff';
    FrequencyDomainContext.fillRect(0, 0, FrequencyDomainCanvas.width, FrequencyDomainCanvas.height);
    // FrequencyDomainContext.strokeStyle = '#2a6';
    const barWidth = (FrequencyDomainCanvas.width / buffer.length) * 2.5;
    let x = 0;

    for (let i = 0; i < buffer.length; i++) {
        const barHeight = buffer[i];
        FrequencyDomainContext.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        FrequencyDomainContext.fillRect(
            x,
            FrequencyDomainCanvas.height - barHeight / 2,
            barWidth,
            barHeight / 2
        );
        x += barWidth + 1;
    }

    animationFrameRequestId = requestAnimationFrame(drawFrequencyDomainGraph);
}

function drawGraphs() {
    drawTimeDoaminGraph();
    drawFrequencyDomainGraph();
}

/**
 * References:
 * - https://www.w3schools.com/html/html5_canvas.asp
 * - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
 * - https://stackoverflow.com/questions/14789283/what-does-the-fft-data-in-the-web-audio-api-correspond-to
 * - https://stackoverflow.com/questions/4364823/how-do-i-obtain-the-frequencies-of-each-value-in-an-fft
 * - https://dsp.stackexchange.com/questions/2818/extracting-frequencies-from-fft
 * - https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createGain
 * - 
 */