import { values } from "../model/values.js";

// export function monophonicCompareNotes() {
//     const detected = values.audio.frequency;
//     const expected = values.score.expectedFreqs;

//     // console.log("[LOG] Detected", detected);
//     // console.log("[LOG] Expected", expected);
//     if (!detected || expected.length === 0) return false;

//     return expected.some(freq => {
//         const cents = 1200 * Math.log2(detected / freq);
//         return Math.abs(cents) < 50;
//     });
// }

/*
 * Testing different distance formualas for the DTW function
 * Based on this site: https://numerics.mathdotnet.com/Distance
 * And the corresponding code: https://github.com/mathnet/mathnet-numerics/blob/master/src/Numerics/Distance.cs
 */

function sumofSquaredDifference(a, b) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return sum;
}

function euclideanDistance(a, b) {
    return Math.sqrt(sumofSquaredDifference(a, b)); // Euclidean is Sqrt of SSD
}


function manhattanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += Math.abs(a[i] - b[i]);
    }
    return sum;
}

export function chebyshevDistance(a, b) {
    let max = 0;

    for (let i = 0; i < a.length; i++) {
        const diff = Math.abs(a[i] - b[i]);
        if (diff > max) max = diff;
    }

    return max;
}

/*
 * p = 1 is manhattan
 * p = 2 is SSD and Euc
 * p > 2 is chebyshev
 * Need to test:
 * p < 1
*/
function minkowskiDistance(a, b, p = 1.5) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += Math.pow(Math.abs(a[i] - b[i]), p);
    }
    return Math.pow(sum, 1 / p);
}


function canberraDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const denom = Math.abs(a[i]) + Math.abs(b[i]);
        if (denom !== 0) {
            sum += Math.abs(a[i] - b[i]) / denom;
        }
    }
    return sum;
}

function cosineDistance(a, b) {
    let ab = 0, a2 = 0, b2 = 0;
    for (let i = 0; i < 12; i++) {
        ab += a[i] * b[i];
        a2 += a[i] * a[i];
        b2 += b[i] * b[i];
    }
    return 1 - (ab / (Math.sqrt(a2) * Math.sqrt(b2)));
}

export function pearsonDistance(a, b) {
    const n = a.length;
    let meanA = 0;
    let meanB = 0;

    for (let i = 0; i < n; i++) {
        meanA += a[i];
        meanB += b[i];
    }
    meanA /= n;
    meanB /= n;

    let numerator = 0;
    let denomA = 0;
    let denomB = 0;
    for (let i = 0; i < n; i++) {
        const da = a[i] - meanA;
        const db = b[i] - meanB;

        numerator += da * db;
        denomA += da * da;
        denomB += db * db;
    }

    const denominator = Math.sqrt(denomA * denomB);
    if (denominator === 0) {
        return 1; // no variation → max distance
    }

    return 1 - (numerator / denominator);
}


/**
 * Compares the two chroma feature arrays from audio and score via DTW
 * @returns boolean of chroma distance
 */
export function compareNotes() {
    const detectedChromaHistory = values.audio.chromaValues;
    const expectedChroma = values.score.chroma;

    if (!expectedChroma || expectedChroma.length === 0) {
        console.warn("[COMPARE] No expected chroma");
        return false;
    }

    if (detectedChromaHistory.length === 0) {
        console.warn("[COMPARE] No detected chroma history");
        return false;
    }

    // console.log("[COMPARE] Expected chroma:", expectedChroma);
    // console.log("[COMPARE] Last detected chroma:", detectedChromaHistory[detectedChromaHistory.length - 1]);


    const expectedChromaHistory = detectedChromaHistory.map(() => [...expectedChroma]);

    const dtw = new DynamicTimeWarping(
        detectedChromaHistory,      // 12 chroma values
        expectedChromaHistory,      // 12 chroma values
        cosineDistance              // Method of comparing chroma vectors
    );

    // "the distance of the dynamic time warping as float"
    const distance = dtw.getDistance();
    const normalisation = distance / (detectedChromaHistory.length + expectedChromaHistory.length);

    // console.log("[COMPARE] DTW distance:", distance);
    // console.log("[COMPARE] Normalized distance:", normalisation);

    // Normalising 
    return {result: (normalisation) < 0.20, dist: distance, norm: normalisation};
}


/*
 * References
 * - https://github.com/GordonLesti/dynamic-time-warping
 * - https://numerics.mathdotnet.com/Distance : Distance Functions that can be used for comparing the 2 chroma arrays
 *  - https://github.com/mathnet/mathnet-numerics/blob/master/src/Numerics/Distance.cs
 *  - https://github.com/mathnet/mathnet-numerics/blob/master/src/Numerics/Statistics/Correlation.cs
 */