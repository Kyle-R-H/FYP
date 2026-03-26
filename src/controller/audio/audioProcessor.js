class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.rms = 0;
    }

    /**
     * Method by cwilso/PitchDetect
     * @param {} buf 
     * @param {int} sampleRate 
     * @returns 
     */
    autoCorrelate(buf, sampleRate) {
        // Implements the ACF2+ algorithm
        let SIZE = buf.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            let val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1;

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;

        for (let i = 0; i < SIZE / 2; i++)
            if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        for (let i = 1; i < SIZE / 2; i++)
            if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

        buf = buf.slice(r1, r2);
        SIZE = buf.length;

        let c = new Array(SIZE).fill(0);

        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE - i; j++) {
                c[i] = c[i] + buf[j] * buf[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;

        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        let x1 = c[T0 - 1];
        let x2 = c[T0];
        let x3 = c[T0 + 1];

        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;

        if (a) T0 = T0 - b / (2 * a);

        this.rms = rms;
        return sampleRate / T0;
    }

    process(inputList) {
        const input = inputList[0];

        if (inputList.length > 0) {
            const channel = input[0];
            this.buffer.push(...channel);

            // Divide buffer into windows
            if (this.buffer.length >= 1024) {
                const window = this.buffer.slice(0, 1024);
                this.buffer = [];

                const frequency = this.autoCorrelate(window, sampleRate);
                
                this.port.postMessage({
                    frequency: frequency,
                    rms: this.rms
                });
            }

        }

        return true;
    }

}

registerProcessor("audio-processor", AudioProcessor);


/* References:
 * - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor
 * - https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/port#examples
 * - https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet
*/