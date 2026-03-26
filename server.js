const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Enable CORS for your frontend
app.use(cors());
app.use(express.static(path.join(__dirname, "src")));
app.use("/input", express.static(path.join(__dirname, "input")));


// Serve index.html on root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "view","index.html"));
});

// Multer temp storage
const upload = multer({ dest: "tmp/" });

app.post("/test", (req, res) => {
    res.status(200).send("Server Running!");
});


/**
 * Image to MusicXML via OMR using Audiveris
 */
app.post("/convert/score", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    console.log("[AUDIVERIS] ");
    console.dir(req.file);
    
    const originalExt = path.extname(req.file.originalname);
    const originalName = path.basename(req.file.originalname, originalExt);
    const inputPath = path.join("tmp", req.file.originalname);

    console.log("[AUDIVERIS] ");
    console.dir(inputPath);

    // Rename the temp file created by multer
    fs.renameSync(req.file.path, inputPath);

    const outputPath = path.join("tmp", `${originalName}.mxl`);

    // Run Audiveris CLI
    // const cmd = `java -jar /opt/audiveris/opt/audiveris/lib/app/audiveris.jar -batch -export -output tmp ${inputPath}`;
    // const cmd = `java -cp "/opt/audiveris/opt/audiveris/lib/app/audiveris.jar:/opt/audiveris/opt/audiveris/lib/app/*" Audiveris -batch -export -output tmp "${inputPath}"`;
    const cmd = `/opt/audiveris/opt/audiveris/bin/Audiveris -batch -export -output tmp "${inputPath}"`;

    console.log("[AUDIVERIS] ", cmd);
    exec(cmd, (err) => {
        if (err) return res.status(500).send(err.toString() + "\nPaths:\nInput: " + inputPath + "\nOutput: " + outputPath);

        // Send result back to browser
        res.download(outputPath, `${originalName}.mxl`, () => {
            // Clean up temp files
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        });
    });
});

/**
 * MIDI -> MusicXML using MuseScore
 */
app.post("/convert/midi", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    const originalExt = path.extname(req.file.originalname);
    const originalName = path.basename(req.file.originalname, originalExt);
    const inputPath = path.join("tmp", req.file.originalname);
    console.log("input: ", inputPath);

    // Rename the temp file created by multer
    fs.renameSync(req.file.path, inputPath);

    const outputPath = path.join("tmp", `${originalName}.musicxml`);

    const cmd = `xvfb-run -a mscore3 -o ${outputPath} ${inputPath}`; // Adjust CLI name if needed

    console.log("[MSCORE] ", cmd);
    exec(cmd, (err) => {
        if (err) return res.status(500).send(err.toString() + "\nPaths:\nInput: " + inputPath + "\nOutput: " + outputPath);

        res.download(outputPath, `${originalName}.musicxml`, () => {
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
        });
    });
});

app.listen(PORT, () => {
    console.log(`Node server running at http://localhost:${PORT}`);
});

/* References
 *- https://www.w3schools.com/nodejs/default.asp
*/