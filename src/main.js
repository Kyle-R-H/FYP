// Sets up project and dictates what runs in init and how everything is connected

import { initUI } from "/view/ui.js";
import { inputFileController } from "/controller/score/fileController.js";
import { initOSMD } from "/controller/score/osmdController.js";

/**
 * "Main"
*/
window.addEventListener("DOMContentLoaded", async () => {
    initOSMD();
    initUI();

    // File input handler
    document.getElementById("scoreInput").addEventListener("change", inputFileController);

});