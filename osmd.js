import { getExtension } from './helpers.js';

const fileInput = document.getElementById("scoreInput");

const zoomValue = document.getElementById("zoomValue");
const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(document.getElementById("OSMD"), {
    autoResize: true,
    backend: "svg",
});

function adjustZoom(zoomChar) {
    if (zoomChar === "+") {
        const scrollY = window.scrollY;
        osmd.zoom += 0.1;
        osmd.render();
        zoomValue.textContent = "Zoom = " + parseFloat(osmd.zoom).toFixed(1);
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
            zoomValue.textContent = "Zoom = " + parseFloat(osmd.zoom).toFixed(1);
            console.log("Zoom - Success");
            window.scrollTo(0, scrollY);
        }

    } else {
        alert("dev left fault in osmd.js/adjustZoom");
        console.log("dev left fault in osmd.js/adjustZoom");
    }
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
            alert("Midi file uploaded!");

            // TODO: OMR/ MIDI -> MusicXML conversion

            //* This is chromagram data, not rendering
            const buffer = await file.arrayBuffer()
            const midi = new Midi(buffer)

            const chroma = new Array(12).fill(0)

            midi.tracks.forEach(track => {
                track.notes.forEach(note => {
                    const pc = note.midi % 12
                    chroma[pc] += note.duration
                })
            })
            console.log(chroma);


        } else if (fileExtension == "musicxml" || fileExtension == "mxl") {
            try {
                await osmd.load(file);
                osmd.render();
                osmd.cursor.show();
                osmd.cursor.reset();
                console.log("[Log] Success");
            } catch (err) {
                console.error("[Error] Failed to load score | ./osmd.js:", err);
                alert("Could not load this score file.");
            }
        } else {
            alert("[Warning] Implementation in progress | ./osmd.js");
            return;
        }
    });

    // Default Score to be Displayed
    await osmd.load("Scores/Error.musicxml");
    osmd.render();

    zoomValue.textContent = "Zoom = " + parseFloat(osmd.zoom).toFixed(1);
    osmd.cursor.show();

    document.getElementById("next").onclick = () => osmd.cursor.next();
    document.getElementById("prev").onclick = () => osmd.cursor.previous();
    document.getElementById("reset").onclick = () => osmd.cursor.reset();

    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "d") osmd.cursor.next();
        if (e.key === "ArrowLeft" || e.key === "a") osmd.cursor.previous();
    });

    document.getElementById("zoomp").onclick = () => adjustZoom("+");
    document.getElementById("zoomm").onclick = () => adjustZoom("-");
    window.addEventListener("keydown", (e) => {
        if (e.key === "-") adjustZoom("-");
        if (e.key === "=") adjustZoom("+");
    });

});


/**
 *- https://stackoverflow.com/questions/7977084/check-file-type-when-form-submit
 *- https://stackoverflow.com/questions/16388772/maintain-scroll-position-of-large-html-page-when-client-returns
 *- 
*/