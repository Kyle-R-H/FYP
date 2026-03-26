export const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Check file extension
 */
export function getExtension(filename) {
    var parts = filename.split('.');
    // console.log("extension: " + parts[parts.length - 1]);
    return parts[parts.length - 1];
}

/**
 * Convert frequency to MIDI
 * @param {float} frequency
 * @returns MIDI value of Frequency
 */
export function freqToMidi(frequency) {
    return 69 + 12 * Math.log2(frequency / 440);
}

/**
 * Convert MIDI to Frequency
 * @param {float} midi 
 * @returns Frequency value of MIDI
 */
export function midiToFreq(midi) {
    // Western tuning based off A 440
    const A4 = 440;
    return A4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts Freqency to Midi notes to Note Names
 * @returns Note Name
 */
export function freqToNote(frequency) {
    if (!frequency || frequency <= 0) return "-";

    const midi = Math.round(freqToMidi(frequency));
    const note = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;

    return `${note}${octave}`;
}

export function calulateCents(frequency) {
    const midi = freqToMidi(frequency);
    const nearestMidi = Math.round(midi);
    const nearestFreq = midiToFreq(nearestMidi);

    const cents = 1200 * Math.log2(frequency / nearestFreq);

    return {
        cents,
        nearestMidi,
        nearestFreq
    };
}

/** 
 * Based on DanielJDufour fast-max method
 */
export function fastMaxMin(array) {
    let max = array[0];
    let min = array[0];

    let maxIndex = 0;
    let minIndex = 0;

    for (let i = 1; i < array.length; i++) {
        const value = array[i];
        if (value > max) {
            max = value;
            maxIndex = i;
            if (max === 255) break;
        }
        if (value < min) {
            min = value;
            minIndex = i;
            if (min === 255) break;
        }
    }

    return { max, min, maxIndex, minIndex }
}

/* References
 *- https://en.wikipedia.org/wiki/MIDI_tuning_standard 
 */