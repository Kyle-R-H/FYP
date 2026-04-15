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
        method: "ssd",
        threshold: 0.20
    }
}