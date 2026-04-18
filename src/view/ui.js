// Updates views state
import { adjustZoom, getExpectedNotes, osmd } from "/controller/score/osmdController.js";
import { noteNames, freqToNote } from "/controller/helpers.js";
import { toggleAudioListen, startAudioProcessing, stopAudioProcessing } from "/controller/audio/audioController.js";
import { values } from "../model/values.js";

const checkServer = document.getElementById("checkServer");
const toggleInfo = document.getElementById("toggleInfo")
const audioListen = document.getElementById("audioListen");
const audioStart = document.getElementById("audioStart");
const audioStop = document.getElementById("audioStop");

let audioChromaDisplayed = false;  // Only load the audio chroma boxes once 
let scoreChromaDisplayed = false;  // Only load the audio chroma boxes once 

export function initUI() {
    createChromaContainer();

    // // Chromagram
    // const audioChromagram = document.getElementById("audioChromagram");
    // const scoreChromagram = document.getElementById("scoreChromagram");

    checkServer.onclick = async () => {
        try {

            const response = await fetch("http://localhost:5000/test", { method: "POST" });
            console.log("[SERVER] Result: " + response.status);
            console.dir("[SERVER] " + response.text());
            if (response.ok) {
                checkServer.style.backgroundColor = "#2eaf46";
                checkServer.style.color = "white";
            }
        } catch (e) {
            checkServer.style.backgroundColor = "maroon";
            checkServer.style.color = "white";
        }
    }

    toggleInfo.onclick = () => updateInfoVisibility(document.getElementById("info"));

    document.getElementById("next").onclick = () => {
        osmd.cursor.next();
        getExpectedNotes();
    };
    document.getElementById("prev").onclick = () => {
        osmd.cursor.previous();
        getExpectedNotes();
    };
    document.getElementById("reset").onclick = () => {
        osmd.cursor.reset();
        osmd.cursor.show();
        getExpectedNotes();
    };

    const zoomValue = document.getElementById("zoomValue");
    // Init update on window
    zoomValue.textContent = osmd.zoom.toFixed(1);

    document.getElementById("zoomp").onclick = () => {
        adjustZoom("+");
        zoomValue.textContent = osmd.zoom.toFixed(1);
    };

    document.getElementById("zoomm").onclick = () => {
        adjustZoom("-");
        zoomValue.textContent = osmd.zoom.toFixed(1);
    };
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "d") { osmd.cursor.next(); getExpectedNotes(); }
        if (e.key === "ArrowLeft" || e.key === "a") { osmd.cursor.previous(); getExpectedNotes(); }
        if (e.key === "-") { adjustZoom(zoomValue, "-"); }
        if (e.key === "=") { adjustZoom(zoomValue, "+"); }

    });

    // Audio Control
    audioListen.onclick = () => toggleAudioListen(audioListen);
    audioStart.onclick = startAudioProcessing;
    audioStop.onclick = stopAudioProcessing;

    const methodSelect = document.getElementById("dtwMethod");
    const thresholdSlider = document.getElementById("dtwThreshold");
    const thresholdValue = document.getElementById("thresholdValue");

    // Method change
    methodSelect.onchange = () => {
        values.dtw.method = methodSelect.value;
        console.log("[DTW] Method:", values.dtw.method);
    };

    // Threshold change
    thresholdSlider.oninput = () => {
        const val = parseFloat(thresholdSlider.value);
        values.dtw.threshold = val;
        thresholdValue.textContent = val.toFixed(2);
    };
}


function createChromaContainer() {
    const chromaContainer = document.getElementById("chromaContainer");
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

    // Score chroma container
    const scoreChromaContainer = document.getElementById("scoreChromaContainer");
    if (!scoreChromaDisplayed) {
        // Create 12 boxes for each chroma note
        for (let i = 0; i < 12; i++) {
            const chromaBox = document.createElement('div');
            chromaBox.classList.add('scoreChromaBox');
            scoreChromaContainer.appendChild(chromaBox);
        }
        scoreChromaDisplayed = true;
    }

}

export function updateSignalData({ frequency, rms, cents }) {
    const detectedNoteValue = document.getElementById("detectedNotes");
    const centsValue = document.getElementById("centsValue");
    const rmsValue = document.getElementById("rmsValue");

    // console.log("[DATA] ", frequency);
    detectedNoteValue.textContent = freqToNote(frequency) + " - " + frequency.toFixed(1) + "Hz";
    centsValue.textContent = Math.round(cents);
    rmsValue.textContent = rms.toFixed(4);
}

export function updateMeydaRMS(meyRMS) {
    const meydaRMS = document.getElementById("meydaRmsValue");
    meydaRMS.textContent = meyRMS.toFixed(4);
}

/**
 * Updates expected notes element with string of detected notes
 * @param {String} noteString 
 */
export function updateExpectedNotes(noteString) {
    const expectedNotes = document.getElementById("expectedNotes");
    expectedNotes.innerHTML = noteString;
}

export function updateAudioControlButtons(hidden) {
    if (hidden) {
        audioStart.hidden = true;
        toggleInfo.hidden = false;
        audioStop.hidden = false;
        audioListen.hidden = false;
    } else {
        audioStart.hidden = false;
        toggleInfo.hidden = true;
        audioStop.hidden = true;
        audioListen.hidden = true;
    }
}

export function updateInfoVisibility(info) {
    if (info.hidden) {
        info.hidden = false;
    } else { info.hidden = true; }
}

/**
 * calulate background colour for audio chroma values
 * @param {array} values 
 * @return background colour for audio chroma values
 */
export function updateChromaColors(values) {
    const boxes = document.querySelectorAll('.chromaBox');

    if (!boxes.length) {
        console.warn("[WARN] No chroma boxes found");
        return;
    }

    boxes.forEach((box, i) => {
        const value = values[i];
        // white = 0, green = 1
        const greenValue = Math.floor((1 - value) * 255);
        box.style.backgroundColor = `rgb(${greenValue}, 255, ${greenValue})`;
    });
}
/**
 * calulate background colour for score chroma values
 * @param {array} values 
 * @return background colour for score chroma values
 */
export function updateScoreChromaColors(values) {
    const boxes = document.querySelectorAll('.scoreChromaBox');

    if (!boxes.length) {
        console.warn("[WARN] No chroma boxes found");
        return;
    }

    boxes.forEach((box, i) => {
        const value = values[i];
        // white = 0, green = 1
        const greenValue = Math.floor((1 - value) * 255);
        box.style.backgroundColor = `rgb(${greenValue}, 255, ${greenValue})`;
    });
}