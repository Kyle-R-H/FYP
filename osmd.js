import { getExtension } from './helpers.js';
import { Midi } from "https://cdn.jsdelivr.net/npm/@tonejs/midi/+esm";
import WebMscore from 'https://cdn.jsdelivr.net/npm/webmscore/webmscore.mjs';


const fileInput = document.getElementById("scoreInput");

// const scoreChromagram = document.getElementById("scoreChromagram");
const zoomValue = document.getElementById("zoomValue");
const centsValue = document.getElementById("centsValue");
const expectedNotes = document.getElementById("expectedNotes");

const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(document.getElementById("OSMD"), {
    autoResize: true,
    backend: "svg",
});

let cursorIndex = 1;
let expectedNotesList = ["-"];

/*
 * Helpers
 */
/**
 * Adjust osmd render zoom level
 * @param {"+" || "-"} zoomChar 
 * @returns adjustment in zoom
 */
function adjustZoom(zoomChar) {
    if (zoomChar === "+") {
        const scrollY = window.scrollY;
        osmd.zoom += 0.1;
        osmd.render();
        zoomValue.textContent = parseFloat(osmd.zoom).toFixed(1);
        console.log("Zoom " + zoomChar + " Success");
        window.scrollTo(0, scrollY);

    } else if (zoomChar === "-") {
        if (osmd.zoom < 0.2) {
            alert("Minimum zoom reached!");
            return;
        } else {
            const scrollY = window.scrollY;
            osmd.zoom -= 0.1;
            osmd.render();
            zoomValue.textContent = parseFloat(osmd.zoom).toFixed(1);
            console.log("Zoom - Success");
            window.scrollTo(0, scrollY);
        }

    } else {
        alert("[WARNING] dev left fault in osmd.js/adjustZoom");
        console.log("[WARNING] dev left fault in osmd.js/adjustZoom");
    }
}

function drawChromagram(data) {

    const rows = 12
    const cols = data.length

    const cellSize = 20

    const svg = d3.select("#scoreChromagram")
        .attr("width", cols * cellSize)
        .attr("height", rows * cellSize)

    const flat = []

    for (let time = 0; time < cols; time++) {
        for (let chroma = 0; chroma < rows; chroma++) {
            flat.push({
                time: time,
                chroma: chroma,
                value: data[time][chroma]
            })
        }
    }

    const color = d3.scaleSequential(d3.interpolateInferno)
        .domain([0, d3.max(flat, d => d.value)])

    svg.selectAll("rect")
        .data(flat)
        .enter()
        .append("rect")
        .attr("x", d => d.time * cellSize)
        .attr("y", d => (11 - d.chroma) * cellSize)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("class", "cell")
        .attr("fill", d => color(d.value))
}

function createNoteList() {
    expectedNotesList = ["-"];

    const sheet = osmd.Sheet;
    if (!sheet) return;

    // Iterate through the measures
    sheet.SourceMeasures.forEach(measure => {
        // for each measure, get the container of notes from a vertical column in the sheet 
        measure.VerticalSourceStaffEntryContainers.forEach(container => {
            const notesAtTime = [];
            container.StaffEntries.forEach(staffEntry => {
                staffEntry.VoiceEntries.forEach(voiceEntry => {
                    voiceEntry.Notes.forEach(note => {
                        if (!note.Pitch) {
                            notesAtTime.push("-");
                        } else {
                            notesAtTime.push(note.Pitch.ToString());
                        }
                    });
                });
            });
            if (notesAtTime.length > 0) {
                expectedNotesList.push(notesAtTime);
            }
        });
    });
}

/**
 * 
 * @returns <p> tags of notes at the position of the cursor
 */
function updateExpectedNotes() {
    if (expectedNotesList.length === 0) {
        expectedNotes.innerHTML = "<p>-</p>";
        return;
    }
    const notes = expectedNotesList[cursorIndex] || ["-"];
    expectedNotes.innerHTML = notes.map(note => "<p>" + note + "</p>").join("");
}


window.addEventListener("DOMContentLoaded", async () => {
    // File input handler
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        const fileExtension = getExtension(file.name);

        console.log("[LOG] File Extension: " + fileExtension);

        if (!file) return;

        if (fileExtension == "mid") {
            console.log("Midi input | Convert");

            // TODO: OMR/ MIDI -> MusicXML conversion

            //* This is chromagram data, not rendering
            const midiData = await file.arrayBuffer()
            const midi = new Midi(midiData)

            const chroma = new Array(12).fill(0)

            midi.tracks.forEach(track => {
                track.notes.forEach(note => {
                    const pc = note.midi % 12
                    chroma[pc] += note.duration
                })
            })
            console.log("[LOG] Midi chroma: " + chroma);

            //* Midi conversion to Musicxml
            await WebMscore.ready;

            const midiBytes = new Uint8Array(midiData)
            const score = await WebMscore.load("midi", midiBytes);

            //! Save method doesnt work on server-less browser implementations
            const musicxml = await WebMscore.save(score, "musicxml");

            console.log("MusicXML:", musicxml);
            await osmd.load(musicxml);
            osmd.render();

        } else if (fileExtension == "musicxml" || fileExtension == "mxl") {
            try {
                await osmd.load(file);
                osmd.render();
                osmd.cursor.show();
                osmd.cursor.reset();

                createNoteList();
                cursorIndex = 1;
                updateExpectedNotes();
                console.log("[LOG] Success");
            } catch (err) {
                console.error("[ERROR] Failed to load score | ./osmd.js:", err);
                alert("Could not load this score file.");
            }

            // Chromagram Data
            try {
                const text = await file.text()
                const xml = new DOMParser().parseFromString(text, "text/xml")
                const notes = xml.getElementsByTagName("note")
                const chroma = new Array(12).fill(0)
                const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

                for (let n of notes) {

                    if (n.getElementsByTagName("rest").length) continue

                    const step = n.getElementsByTagName("step")[0].textContent

                    const alterNode = n.getElementsByTagName("alter")[0]
                    const alter = alterNode ? parseInt(alterNode.textContent) : 0

                    const pc = (map[step] + alter + 12) % 12

                    chroma[pc] += 1
                }
                drawChromagram(chroma);
                console.log("Chromagram: " + chroma);
            } catch (err) {
                console.error("[ERROR] Failed to load chromagram | ./osmd.js:", err);
                alert("Could not load this score's chromagram");
            }
        } else {
            alert("[WARNING] Implementation in progress | ./osmd.js");
            return;
        }

    });

    // Default Score to be Displayed
    await osmd.load("Scores/Error.musicxml");
    osmd.render();

    zoomValue.textContent = parseFloat(osmd.zoom).toFixed(1);
    osmd.cursor.show();

    document.getElementById("next").onclick = () => { osmd.cursor.next(); cursorIndex++; updateExpectedNotes(); console.log("[LOG] Cursor Index = " + cursorIndex); };
    document.getElementById("prev").onclick = () => { osmd.cursor.previous(); cursorIndex = Math.max(0, cursorIndex - 1); updateExpectedNotes(); console.log("[LOG] Cursor Index = " + cursorIndex); };
    document.getElementById("reset").onclick = () => { osmd.cursor.reset(); cursorIndex = 1; updateExpectedNotes(); console.log("[LOG] Cursor Index = " + cursorIndex); };

    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "d") { osmd.cursor.next(); cursorIndex++; updateExpectedNotes(); console.log("[LOG] Cursor Index = " + cursorIndex); };
        if (e.key === "ArrowLeft" || e.key === "a") { osmd.cursor.previous(); cursorIndex = Math.max(0, cursorIndex - 1); updateExpectedNotes(); console.log("[LOG] Cursor Index = " + cursorIndex); };
    });

    document.getElementById("zoomp").onclick = () => adjustZoom("+");
    document.getElementById("zoomm").onclick = () => adjustZoom("-");
    window.addEventListener("keydown", (e) => {
        if (e.key === "-") adjustZoom("-");
        if (e.key === "=") adjustZoom("+");
    });

});


/**
 *- https://github.com/opensheetmusicdisplay/opensheetmusicdisplay
 *- https://stackoverflow.com/questions/7977084/check-file-type-when-form-submit
 *- https://stackoverflow.com/questions/16388772/maintain-scroll-position-of-large-html-page-when-client-returns
 *- 
*/