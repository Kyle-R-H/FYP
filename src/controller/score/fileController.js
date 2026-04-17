import { updateExpectedNotes } from "/view/ui.js";
import { getExtension } from "../helpers.js";
import { osmd, osmdRender, fileConversion } from "./osmdController.js";

export async function loadDefaultScore() {
    // Default Score to be Displayed
    try {
        // await osmd.load("/input/MusicXML/Fur_Elise.mxl");
        await osmd.load("/input/Error.musicxml");
        updateExpectedNotes("<p>-</p>");
        osmdRender();

    } catch (err) {
        console.error("[ERROR] Failed to load score | ./osmd.js", err);
        alert("Could not load score. Please try again or with a different score");
    }
}

/**
 * 
 * @param {*} event 
 * @returns 
 */
export async function inputFileController(event) {
    const file = event.target.files[0];
    const fileExtension = getExtension(file.name);

    console.log("[LOG] File Extension: " + fileExtension);

    if (!file) return;

    if (fileExtension == "mid") {
        console.log("[LOG] Converting MIDI file");

        //Send file to docker
        const musicxmlArrayBuffer = await fileConversion(file, "midi");

        if (musicxmlArrayBuffer) {
            const musicxmlText = new TextDecoder().decode(musicxmlArrayBuffer);
            if (osmd && osmd.Sheet) {
                osmd.clear();
            }
            await osmd.load(musicxmlText);
            osmdRender();
        }


        // //* Chromagram data
        // const midiData = await file.arrayBuffer()
        // const midi = new Midi(midiData)

        // const chroma = new Array(12).fill(0)

        // midi.tracks.forEach(track => {
        //     track.notes.forEach(note => {
        //         const pc = note.midi % 12
        //         chroma[pc] += note.duration
        //     })
        // })
        // console.log("[LOG] Midi chroma: " + chroma);

    } else if (fileExtension == "png" || fileExtension == "jpg" || fileExtension == "pdf") {
        // Test other formats
        console.log("[LOG] Converting file using OMR (" + fileExtension + ")");

        const musicxmlArrayBuffer = await fileConversion(file, "score");
        if (musicxmlArrayBuffer) {
            const musicxmlText = new TextDecoder().decode(musicxmlArrayBuffer);
            if (osmd && osmd.Sheet) {
                osmd.clear();
            }
            await osmd.load(musicxmlText);
            osmdRender();
        }

    } else if (fileExtension == "musicxml" || fileExtension == "mxl") {
        try {
            if (osmd && osmd.Sheet) {
                osmd.clear();
            }
            await osmd.load(file);
            expectedNotes.textContent = "-";
            osmdRender();
            console.log("[LOG] MusicXML Load Successful");
        } catch (err) {
            console.error("[ERROR] Failed to load score | ./osmd.js:", err);
            alert("Could not load this score file.");
        }

        // //* Chromagram Data
        // try {
        //     const text = await file.text()
        //     const xml = new DOMParser().parseFromString(text, "text/xml")
        //     const notes = xml.getElementsByTagName("note")
        //     const chroma = new Array(12).fill(0)
        //     const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

        //     for (let n of notes) {

        //         if (n.getElementsByTagName("rest").length) continue

        //         const step = n.getElementsByTagName("step")[0].textContent

        //         const alterNode = n.getElementsByTagName("alter")[0]
        //         const alter = alterNode ? parseInt(alterNode.textContent) : 0

        //         const pc = (map[step] + alter + 12) % 12

        //         chroma[pc] += 1
        //     }
        //     drawChromagram(chroma);
        //     console.log("Chromagram: " + chroma);
        // } catch (err) {
        //     console.error("[ERROR] Failed to load chromagram | ./osmd.js:", err);
        //     alert("Could not load this score's chromagram");
        // }

    } else {
        alert("[WARNING] Implementation in progress | ./osmd.js");
        return;
    }
}