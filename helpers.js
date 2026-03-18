/**
 * Check file extension
 */
export function getExtension(filename) {
    var parts = filename.split('.');
    console.log("extension: " + parts[parts.length - 1]);
    return parts[parts.length - 1];
}

/**
 * Converts Freqency to Midi notes to Note Names
 * @returns Note Name
 */
export function freqToNote(freq) {
    if (!freq || freq <= 0) return "-";

    // Round to 2 decimal places
    freq = freq.toFixed(2);

    const A4 = 440;
    const midi = Math.round(69 + 12 * Math.log2(freq / A4));

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const note = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;

    return `${note}${octave}`;
}