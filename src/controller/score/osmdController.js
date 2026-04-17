import { freqToNote, freqsToChroma } from '/controller/helpers.js';
import { values } from "/model/values.js";
import { updateExpectedNotes } from '/view/ui.js';
import { loadDefaultScore } from "/controller/score/fileController.js";

export let osmd = null;

export async function initOSMD() {
    osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(document.getElementById("OSMD"), {
        autoResize: true,
        backend: "svg",
    });
    await loadDefaultScore();
}

/**
 * Adjust osmd render zoom level
 * @param {char} zoomChar only accepts '+' and '-' 
 * @returns adjustment in zoom
 */
export function adjustZoom(zoomChar) {
    const scrollY = window.scrollY;

    if (zoomChar === "+") {
        osmd.zoom += 0.1;
        osmd.render();
        console.log("[LOG] Zoom " + zoomChar + " Successful");
        window.scrollTo(0, scrollY);

    } else if (zoomChar === "-") {
        if (osmd.zoom < 0.2) {
            alert("Minimum zoom reached!");
            return;
        } else {
            osmd.zoom -= 0.1;
            osmd.render();
            console.log("[LOG] Zoom " + zoomChar + " Successful");
            window.scrollTo(0, scrollY);
        }

    } else {
        alert("[WARN] dev left fault in osmd.js/adjustZoom");
        console.log("[WARN] dev left fault in osmd.js/adjustZoom");
    }
}

/**
 * Shorter osmd.render() and cursor control
 */
export function osmdRender() {
    osmd.render();
    osmd.cursor.show();
    osmd.cursor.reset();
    getExpectedNotes();
}

export async function fileConversion(file, type) {
    const formData = new FormData();
    formData.append("file", file);

    const endpoint = type === "midi" ? "convert/midi" : "convert/score";

    const response = await fetch(`http://localhost:5000/${endpoint}`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        const text = await response.text();
        alert("Conversion failed: " + text);
        return null;
    }

    // Get downloaded file as blob
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return arrayBuffer;
}




/**
 * Get expected notes based on voiceEnteries of the osmd cursor location
 * @returns <p> tags of notes at the position of the cursor
 */
export function getExpectedNotes() {
    const iterator = osmd.cursor.Iterator;
    if (!iterator) {
        values.score.expectedFreqs = [];
        updateExpectedNotes("<p>-</p>");
        return;
    }

    const voiceEntries = iterator.CurrentVoiceEntries;
    // console.log("VoiceEntries:", iterator.CurrentVoiceEntries);

    if (!voiceEntries || voiceEntries.length === 0) {
        values.score.expectedFreqs = [];

        updateExpectedNotes("<p>-</p>");
        return;
    }

    const notes = [];
    const freqs = [];
    voiceEntries.forEach(voiceEntry => {
        voiceEntry.Notes.forEach(note => {
            const pitch = note.Pitch;
            if (!pitch) return;
            freqs.push(pitch.Frequency);
            notes.push(freqToNote(pitch.Frequency) + " - " + pitch.Frequency.toFixed(2) + "Hz");
        });
    });

    updateExpectedNotes([...new Set(notes)].map(notes => `<p>${notes}</p>`).join(""));
    values.score.expectedFreqs = freqs;
    values.score.chroma = freqsToChroma(freqs);
}

/**
 *- https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
 *- https://stackoverflow.com/questions/7977084/check-file-type-when-form-submit
 *- https://stackoverflow.com/questions/16388772/maintain-scroll-position-of-large-html-page-when-client-returns
 *- 
*/