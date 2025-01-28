/**
 * EAS generator for the EASjs library
 * @module EASGenerator
 */

const fs = require('fs');
const path = require('path');
const WaveFile = require('wavefile').WaveFile;
const ffmpeg = require('ffmpeg-static');
const { execFile } = require('child_process');
const { promisify } = require('util');
const messages = require('./locals/en_us.json');
const execFileAsync = promisify(execFile);

const SAMPLE_RATE = 24000;
const BIT_DEPTH = 16;

const MODES = {
    /**
     * Default mode.
     * Standard headers, standard attention tones.
     */
    DEFAULT: 'DEFAULT',

    /**
     * National Weather Service mode.
     * Standard headers, uses 1050hz attention tone.
     */
    NWS: 'NWS',

    /**
     * Digital mode.
     * Emulate a SAGE DIGITAL 3644 EAS encoder.
     */
    DIGITAL: 'DIGITAL',

    /**
     * Sage mode.
     * Emulate a standard SAGE EAS 1822 EAS encoder.
     */
    SAGE: 'SAGE',

    /**
     * Trilithic mode.
     * Emulate a Trilithic EAS encoder.
     */
    TRILITHIC: 'TRILITHIC'
};

/**
 * Generates a sine wave buffer.
 * @param {number} freq - Frequency of the sine wave in Hz.
 * @param {number} durationMs - Duration of the sine wave in milliseconds.
 * @param {number} [volumeDB=0] - Volume of the sine wave in decibels.
 * @returns {Float32Array} - The generated sine wave buffer.
 */
function generateSine(freq, durationMs, volumeDB = 0) {
    const samples = Math.round((durationMs / 1000) * SAMPLE_RATE);
    const amplitude = 10 ** (volumeDB / 20);
    const buffer = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
        buffer[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
    }
    return buffer;
}

/**
 * Creates a mark tone.
 * @returns {Float32Array} - The generated mark tone buffer.
 */
function createMark() {
    return generateSine(2083.3, 1000 / 520.83, -3);
}

/**
 * Creates a space tone.
 * @returns {Float32Array} - The generated space tone buffer.
 */
function createSpace() {
    return generateSine(1562.5, 1000 / 520.83, -3);
}

/**
 * Creates an attention tone based on the specified mode.
 * @param {string} [mode=MODES.DEFAULT] - The mode for the attention tone.
 * @returns {Float32Array} - The generated attention tone buffer.
 */
function createAttentionTone(mode = MODES.DEFAULT) {
    switch (mode) {
        case MODES.NWS:
            return generateSine(1050, 9000, -4);
        default:
            const tone1 = generateSine(853, 8000, -10);
            const tone2 = generateSine(960, 8000, -10);
            const mixed = new Float32Array(tone1.length);
            for (let i = 0; i < mixed.length; i++) {
                mixed[i] = 0.5 * (tone1[i] + tone2[i]);
            }
            return mixed;
    }
}

/**
 * Repeats an audio buffer a specified number of times.
 * @param {Float32Array} buffer - The audio buffer to repeat.
 * @param {number} times - The number of times to repeat the buffer.
 * @returns {Float32Array} - The repeated audio buffer.
 */
function repeatAudio(buffer, times) {
    return concatAudio(...Array(times).fill(buffer));
}

/**
 * Encodes a header based on the specified data and mode.
 * @param {string} data - The data to encode in the header.
 * @param {string} [mode=MODES.DEFAULT] - The mode for encoding the header.
 * @returns {Float32Array} - The encoded header buffer.
 */
function encodeHeader(data, mode = MODES.DEFAULT) {
    let buffer = new Float32Array(0);
    let processedData = data;

    switch (mode) {
        case MODES.NWS:
            processedData += '\x00\x00';
            break;
        case MODES.DIGITAL:
            processedData = '\x00' + data + '\xFF\xFF\xFF';
            break;
        case MODES.SAGE:
            processedData += '\xFF';
            break;
    }

    for (const char of processedData) {
        const bits = char.charCodeAt(0).toString(2)
            .padStart(8, '0')
            .split('')
            .reverse()
            .join('');

        for (const bit of bits) {
            buffer = concatAudio(buffer, bit === '1' ? createMark() : createSpace());
        }
    }

    switch (mode) {
        case MODES.DIGITAL:
            const firstTransmission = buffer;
            const standardData = '\xAB' + data + '\xFF\xFF\xFF';
            let standardBuffer = new Float32Array(0);

            for (const char of standardData) {
                const bits = char.charCodeAt(0).toString(2)
                    .padStart(8, '0')
                    .split('')
                    .reverse()
                    .join('');

                for (const bit of bits) {
                    standardBuffer = concatAudio(standardBuffer, bit === '1' ? createMark() : createSpace());
                }
            }

            return concatAudio(
                firstTransmission,
                createSilence(1000),
                standardBuffer,
                createSilence(1000),
                standardBuffer
            );

        default:
            return repeatAudio(concatAudio(buffer, createSilence(1000)), 3);
    }
}

/**
 * Creates an End of Message (EOM) signal based on the specified mode.
 * @param {string} [mode=MODES.DEFAULT] - The mode for creating the EOM signal.
 * @returns {Float32Array} - The generated EOM signal buffer.
 */
function createEOM(mode = MODES.DEFAULT) {
    switch (mode) {
        case MODES.DIGITAL:
            let eomPart1 = '\x00' + '\xAB'.repeat(16) + 'NNNN' + '\xFF\xFF\xFF';
            let bufferPart1 = new Float32Array(0);

            for (const char of eomPart1) {
                const bits = char.charCodeAt(0).toString(2)
                    .padStart(8, '0')
                    .split('')
                    .reverse()
                    .join('');

                for (const bit of bits) {
                    bufferPart1 = concatAudio(bufferPart1, bit === '1' ? createMark() : createSpace());
                }
            }

            let eomPart2 = '\xAB'.repeat(16) + 'NNNN' + '\xFF\xFF\xFF';
            let bufferPart2 = new Float32Array(0);

            for (const char of eomPart2) {
                const bits = char.charCodeAt(0).toString(2)
                    .padStart(8, '0')
                    .split('')
                    .reverse()
                    .join('');

                for (const bit of bits) {
                    bufferPart2 = concatAudio(bufferPart2, bit === '1' ? createMark() : createSpace());
                }
            }

            return concatAudio(
                bufferPart1,
                createSilence(1000),
                bufferPart2,
                createSilence(1000),
                bufferPart2
            );

        default:
            return encodeHeader('\xAB'.repeat(16) + 'NNNN', mode);
    }
}

/**
 * Generates an EAS alert audio file.
 * @param {string} zczcMessage - The ZCZC message to encode in the alert.
 * @param {Object} [options={}] - Options for generating the alert.
 * @param {string} [options.mode='DEFAULT'] - The mode for generating the alert.
 * @param {boolean} [options.attentionTone=true] - Whether to include an attention tone.
 * @param {string} [options.audioPath=null] - Path to an additional audio file to include.
 * @param {string} [options.outputFile='output.wav'] - The output file name.
 * @returns {Float32Array} - The generated EAS alert buffer.
 */
async function generateEASAlert(zczcMessage, options = {}) {
    const {
        mode = 'DEFAULT',
        attentionTone = true,
        audioPath = null,
        outputFile = 'output.wav'
    } = options;

    let audioBuffer = new Float32Array(0);
    if (audioPath) {
        if (!fs.existsSync(audioPath)) throw new Error(messages.audioFileNotFound);
        const tempWav = path.resolve('temp_conversion.wav');
        try {
            await execFileAsync(ffmpeg, [
                '-hide_banner',
                '-y',
                '-i', path.resolve(audioPath),
                '-ar', String(SAMPLE_RATE),
                '-ac', '1',
                '-acodec', 'pcm_s16le',
                tempWav
            ]);
            const wav = new WaveFile(fs.readFileSync(tempWav));
            wav.toBitDepth('32f');
            audioBuffer = new Float32Array(wav.getSamples(true, Float32Array));
        } catch (error) {
            console.error('Error during audio conversion:', error);
        } finally {
            if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
        }
    }

    let output = createSilence(1000);
    output = concatAudio(
        output,
        encodeHeader('\xAB'.repeat(16) + zczcMessage, mode),
        createSilence(mode === 'TRILITHIC' ? 150 : 500)
    );

    if (attentionTone) {
        output = concatAudio(
            output,
            createAttentionTone(mode),
            createSilence(1000)
        );
    }

    if (audioBuffer.length > 0) {
        output = concatAudio(output, audioBuffer, createSilence(1000));
    }

    const eom = createEOM(mode);
    output = concatAudio(output, eom, createSilence(1000));

    const int16Buffer = new Int16Array(output.length);
    for (let i = 0; i < output.length; i++) {
        int16Buffer[i] = Math.max(-32768, Math.min(32767, output[i] * 32767));
    }

    if (outputFile.endsWith('.mp3')) {
        const tempWav = path.resolve('temp_export.wav');
        try {
            console.log('Creating temporary WAV file for MP3 conversion...');
            const wav = new WaveFile();
            wav.fromScratch(1, SAMPLE_RATE, BIT_DEPTH, int16Buffer);
            fs.writeFileSync(tempWav, wav.toBuffer());

            console.log('Converting WAV to MP3...');
            await execFileAsync(ffmpeg, [
                '-hide_banner',
                '-y',
                '-i', tempWav,
                '-codec:a', 'libmp3lame',
                '-b:a', '128k',
                path.resolve(outputFile)
            ]);
        } catch (error) {
            console.error('Error during MP3 conversion:', error);
        } finally {
            if (fs.existsSync(tempWav)) {
                fs.unlinkSync(tempWav);
            }
        }
    } else {
        const wav = new WaveFile();
        wav.fromScratch(1, SAMPLE_RATE, BIT_DEPTH, int16Buffer);
        fs.writeFileSync(path.resolve(outputFile), wav.toBuffer());
    }

    return output;
}

/**
 * Creates a silence buffer for a specified duration.
 * @param {number} durationMs - The duration of the silence in milliseconds.
 * @returns {Float32Array} - The generated silence buffer.
 */
function createSilence(durationMs) {
    return new Float32Array(Math.round((durationMs / 1000) * SAMPLE_RATE));
}

/**
 * Concatenates multiple audio buffers into one.
 * @param {...Float32Array} buffers - The audio buffers to concatenate.
 * @returns {Float32Array} - The concatenated audio buffer.
 */
function concatAudio(...buffers) {
    const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;

    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}

module.exports = {
    generateEASAlert,
    MODES
};