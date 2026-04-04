/**
 * Check file extension
 */
function getExtension(filename) {
    var parts = filename.split('.');
    console.log("extension: " + parts[parts.length - 1]);
    return parts[parts.length - 1];
}

window.addEventListener("DOMContentLoaded", async () => {
    const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(document.getElementById("OSMD"), {
        autoResize: true,
        backend: "svg",
        // disableCursor: false
    });

    // File input handler
    const fileInput = document.getElementById("scoreInput");
    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files[0];
        const fileType = getExtension(file.name);
        console.log("filetype: " + fileType);
        if (!file) return;

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

    osmd.cursor.show();

    document.getElementById("next").onclick = () => osmd.cursor.next();
    document.getElementById("prev").onclick = () => osmd.cursor.previous();
    document.getElementById("reset").onclick = () => osmd.cursor.reset();

    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") osmd.cursor.next();
        if (e.key === "ArrowLeft") osmd.cursor.previous();
    });
});


// https://stackoverflow.com/questions/7977084/check-file-type-when-form-submit