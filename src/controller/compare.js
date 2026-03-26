import { values } from "../model/values.js";

export function compareNotes() {
    const detected = values.audio.frequency;
    const expected = values.score.expectedFreqs;

    // console.log("[LOG] Detected", detected);
    // console.log("[LOG] Expected", expected);
    if (!detected || expected.length === 0) return false;

    return expected.some(freq => {
        const cents = 1200 * Math.log2(detected / freq);
        return Math.abs(cents) < 50;
    });
}