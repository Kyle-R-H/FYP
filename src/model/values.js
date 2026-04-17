export const values = {
    audio: {
        cents: 0,
        rms: 0,
        frequency: 0,
        chroma: new Array(12).fill(0),
        chromaValues : []
    },
    score: {
        expectedFreqs: [],
        chroma: new Array(12).fill(0),
    },
    dtw: {
        method: "cosine",
        threshold: 0.22
    }
}