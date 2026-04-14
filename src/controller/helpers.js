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
 * Convert MIDI to Frequency
 * @param {float} midi 
 * @returns Frequency value of MIDI
 */
export function midiToFreq(midi) {
    // Western tuning based off A 440
    return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert freq to MIDI
 * @param {float} freq
 * @returns MIDI value of Frequency
 */
export function freqToMidi(freq) {
    return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Converts Freqency to Midi notes to Note Names
 * @returns Note Name
 */
export function freqToNote(freq) {
    if (!freq || freq <= 0) return "-";

    const midi = Math.round(freqToMidi(freq));
    const note = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;

    return `${note}${octave}`;
}

/**
 * Converts Freq to MIDI, rounds the MIDI value, % 12 for pitch classes, + 12 to remove negatives, % corrects values to [0-11]
 * @param {float} freq 
 * @returns 
 */
export function freqToPitchClass(freq) {
    return ((Math.round(freqToMidi(freq)) % 12) + 12) % 12;
}

export function freqsToChroma(freqs) {
    const chroma = new Array(12).fill(0);
    for (const f of freqs) {
        if (f > 0) chroma[freqToPitchClass(f)]++;
    }
    return normalizeVector(chroma);
}

export function calulateCents(freq) {
    const nearestMidi = Math.round(freqToMidi(freq));
    const nearestFreq = midiToFreq(nearestMidi);
    return {
        cents: 1200 * Math.log2(freq / nearestFreq),
        nearestMidi,
        nearestFreq
    };
}

/**
 * L1 Normalisation
 */
export function normalizeVector(vec) {
    const sum = vec.reduce((a, b) => a + b, 0);
    if (sum === 0) return vec.slice();
    else return vec.map(v => v / sum);
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
 * - https://en.wikipedia.org/wiki/MIDI_tuning_standard 
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
 * -
 */