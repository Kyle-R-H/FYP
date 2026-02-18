console.log("Audio Javascript");

const audioStart = document.getElementById("audioStart");
const audioStop = document.getElementById("audioStop");
// audioStart.addEventListener("change", async (event) => {
//     console.log("audioStart");
//     startAudioProcessing();
// });
// audioStop.addEventListener("change", async (event) => {
//     const file = event.target.files[0];
//     console.log("audioStop");
//     stopAudioProcessing();
// });
audioStart.onclick = () => startAudioProcessing();
audioStop.onclick = () => stopAudioProcessing();

let openSheetMusicDisplayInstance = null; // OSMD instance
let audioContext = null;                  // WebAudio AudioContext
let mediaStreamSourceNode = null;         // MediaStreamAudioSourceNode for mic input
// let meydaAnalyzerInstance = null;         // Meyda analyzer
// let analyserNode = null;                  // WebAudio AnalyserNode used for raw waveform + pitch
// let silentGainNode = null;                // zero-gain sink to keep audio graph "active" on some platforms

async function startAudioProcessing() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume().catch(() => { });
    mediaStreamSourceNode = audioContext.createMediaStreamSource(stream);

    // analyserNode = audioContext.createAnalyser();
    // analyserNode.fftSize = 2048;
    // mediaStreamSourceNode.connect(analyserNode);

    // // silent gain to keep audio graph active on some browsers
    // silentGainNode = audioContext.createGain();
    // silentGainNode.gain.value = 0;
    // analyserNode.connect(silentGainNode);
    // try { silentGainNode.connect(audioContext.destination); } catch (e) { /* ignore */ }

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

    // if (!animationFrameRequestId) drawWaveformAndUpdate();
    // logDebugMessage('Microphone started — audioCtx state: ' + audioContext.state);
}

function stopAudioProcessing() {
    // if (meydaAnalyzerInstance) { try { meydaAnalyzerInstance.stop(); } catch (e) { } meydaAnalyzerInstance = null; }
    // if (animationFrameRequestId) { cancelAnimationFrame(animationFrameRequestId); animationFrameRequestId = null; }
    // if (silentGainNode) { try { silentGainNode.disconnect(); } catch (e) { } silentGainNode = null; }
    // if (analyserNode) { try { analyserNode.disconnect(); } catch (e) { } analyserNode = null; }
    if (mediaStreamSourceNode) { try { mediaStreamSourceNode.disconnect(); console.log("disconnected");} catch (e) {console.log("ERR: " + e); } mediaStreamSourceNode = null; console.log("medastreamosurcenode = Null"); }
    if (audioContext) { try { audioContext.close(); } catch (e) { } audioContext = null; }
    // logDebugMessage('Microphone stopped');
}