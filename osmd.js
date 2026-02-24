// import { OpenSheetMusicDisplay } from "./node_modules/opensheetmusicdisplay/build/dist/src/OpenSheetMusicDisplay/OpenSheetMusicDisplay";

const zoomValue = document.getElementById("zoomValue");

const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(document.getElementById("OSMD"), {
    autoResize: true,
    backend: "svg",
});

/**
 * Check file extension
 */
function getExtension(filename) {
    var parts = filename.split('.');
    console.log("extension: " + parts[parts.length - 1]);
    return parts[parts.length - 1];
}

function adjustZoom(zoomChar) {
    if (zoomChar === "+") {
        const scrollY = window.scrollY;
        osmd.zoom += 0.1;
        osmd.render();
        zoomValue.textContent = "Zoom = " + parseFloat(osmd.zoom).toFixed(1);
        console.log("Zoom " + zoomChar + " Success");
        window.scrollTo(0, scrollY);

    } else if (zoomChar === "-") {
        const scrollY = window.scrollY;
        osmd.zoom -= 0.1;
        osmd.render();
        zoomValue.textContent = "Zoom = " + parseFloat(osmd.zoom).toFixed(1);
        console.log("Zoom - Success");
        window.scrollTo(0, scrollY);

    } else {
        alert("dev left fault in osmd.js/adjustZoom");
        console.log("dev left fault in osmd.js/adjustZoom");
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    // File input handler
    const fileInput = document.getElementById("scoreInput");
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        const fileType = getExtension(file.name);
        console.log("filetype: " + fileType);
        if (!file) return;

        // if (fileType == ".mid") {
        //     console.log("Midi input | Convert");
        //     alert("Midi file uploaded!");
        //     // TODO: OMR/ MIDI -> MusicXML conversion

        // } else 
        if (fileType == "musicxml" || fileType == "mxl") {
            try {
                await osmd.load(file);
                osmd.render();
                osmd.cursor.show();
                osmd.cursor.reset();
                console.log("Success");
            } catch (err) {
                console.error("Failed to load score:", err);
                alert("Could not load this score file.");
                console.log("Err");
            }
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