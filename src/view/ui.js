// Updates views state
import { adjustZoom, getExpectedNotes, osmd } from "/controller/score/osmdController.js";
import { noteNames, freqToNote } from "/controller/helpers.js";
import { toggleAudioListen, startAudioProcessing, stopAudioProcessing } from "/controller/audio/audioController.js";

const audioListen = document.getElementById("audioListen");
const audioStart = document.getElementById("audioStart");
const audioStop = document.getElementById("audioStop");

let audioChromaDisplayed = false;  // Only load the audio chroma boxes once 

export function initUI() {
    createChromaContainer();

    // Chromagram
    const audioChromagram = document.getElementById("audioChromagram");
    const scoreChromagram = document.getElementById("scoreChromagram");

    document.getElementById("checkServer").onclick = async () => {
        const response = await fetch("http://localhost:5000/test", { method: "POST" });
        console.log("[SERVER] Result: " + response.status);
        console.dir("[SERVER] " + response.text());
    }

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
    document.getElementById("zoomp").onclick = () => adjustZoom("+");
    document.getElementById("zoomm").onclick = () => adjustZoom("-");

    const zoomValue = document.getElementById("zoomValue");
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "d") { osmd.cursor.next(); getExpectedNotes(); }
        if (e.key === "ArrowLeft" || e.key === "a") { osmd.cursor.previous(); getExpectedNotes(); }
        if (e.key === "-") { adjustZoom("-"); zoomValue.textContent = parseFloat(osmd.zoom).toFixed(1); }
        if (e.key === "=") { adjustZoom("+"); zoomValue.textContent = parseFloat(osmd.zoom).toFixed(1); }

    });

    // Audio Control
    audioListen.onclick = () => toggleAudioListen(audioListen);
    audioStart.onclick = startAudioProcessing;
    audioStop.onclick = stopAudioProcessing;
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
}

export function updateSignalData({ frequency, rms, cents }) {
    const fundamentalFrequencyValue = document.getElementById("fundaFreqValue");
    const frequencyNoteValue = document.getElementById("freqNoteValue");
    const centsValue = document.getElementById("centsValue");
    const rmsValue = document.getElementById("rmsValue");

    // console.log("[DATA] ", frequency);
    fundamentalFrequencyValue.textContent = frequency.toFixed(1);
    frequencyNoteValue.textContent = freqToNote(frequency);
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
        audioStop.hidden = false;
        audioStart.hidden = true;
        audioListen.hidden = false;
    } else {
        audioStop.hidden = true;
        audioStart.hidden = false;
        audioListen.hidden = true;
    }
}

/**
 * calulate background colour for chroma values
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
        // white = 1, green = 0
        const greenValue = Math.floor(value * 255);
        box.style.backgroundColor = `rgb(${greenValue}, 255, ${greenValue})`;
    });
}