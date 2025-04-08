/**
 * EAS generator for the EASjs library
 * @module EASGenerator
 */

const fs = require('fs');
const path = require('path');
const { WaveFile } = require('wavefile');
const ffmpeg = require('ffmpeg-static');
const { execFile } = require('child_process');
const { promisify } = require('util');
const messages = require('./locals/en_us.json');
const execFileAsync = promisify(execFile);

const SAMPLE_RATE = 24000;
const BIT_DEPTH = 16;

const MODES = {
    DEFAULT: 'DEFAULT', // Default mode
    NWS: 'NWS', // National Weather Service (NWS) mode
    DIGITAL: 'DIGITAL', // Digital mode (SAGE, Trilithic)
    SAGE: 'SAGE', // SAGE Digital mode
    TRILITHIC: 'TRILITHIC' // Trilithic Digital mode
};

/**
 * Generates a sine wave buffer for the given frequency and duration
 * @param {number} freq - Frequency of the sine wave in Hz
 * @param {number} durationMs - Duration of the wave in milliseconds
 * @param {number} volumeDB - Volume in decibels (default is 0)
 * @returns {Float32Array} - The sine wave audio buffer
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
 * Creates a mark tone for EAS signaling
 * @returns {Float32Array} - The mark tone buffer
 */
const createMark = () => generateSine(2083.3, 1000 / 520.83, -3);

/**
 * Creates a space tone for EAS signaling
 * @returns {Float32Array} - The space tone buffer
 */
const createSpace = () => generateSine(1562.5, 1000 / 520.83, -3);

/**
 * Creates an attention tone based on the selected mode
 * @param {string} mode - The mode of the attention tone (default is 'DEFAULT')
 * @returns {Float32Array} - The attention tone buffer
 */
function createAttentionTone(mode = MODES.DEFAULT) {
    switch (mode) {
        case MODES.NWS:
            return generateSine(1050, 9000, -4); // NWS-specific attention tone
        default: {
            const tone1 = generateSine(853, 8000, -10);
            const tone2 = generateSine(960, 8000, -10);
            const mixed = new Float32Array(tone1.length);
            for (let i = 0; i < mixed.length; i++) {
                mixed[i] = 0.5 * (tone1[i] + tone2[i]); // Mix two tones together
            }
            return mixed;
        }
    }
}

/**
 * Repeats the provided audio buffer a given number of times
 * @param {Float32Array} buffer - The audio buffer to repeat
 * @param {number} times - The number of times to repeat the buffer
 * @returns {Float32Array} - The concatenated audio buffer
 */
const repeatAudio = (buffer, times) => concatAudio(...Array(times).fill(buffer));

/**
 * Encodes the EAS header with the provided data and mode
 * @param {string} data - The data to encode
 * @param {string} mode - The mode of encoding (default is 'DEFAULT')
 * @returns {Float32Array} - The encoded header buffer
 */
function encodeHeader(data, mode = MODES.DEFAULT) {
    let buffer = new Float32Array(0);
    let processedData = data;

    switch (mode) {
        case MODES.NWS:
            processedData += '\x00\x00'; break;
        case MODES.DIGITAL:
            processedData = '\x00' + data + '\xFF\xFF\xFF'; break;
        case MODES.SAGE:
            processedData += '\xFF'; break;
    }

    for (const char of processedData) {
        const bits = char.charCodeAt(0).toString(2).padStart(8, '0').split('').reverse().join('');
        for (const bit of bits) {
            buffer = concatAudio(buffer, bit === '1' ? createMark() : createSpace());
        }
    }

    if (mode === MODES.DIGITAL) {
        const firstTransmission = buffer;
        const standardData = '\xAB' + data + '\xFF\xFF\xFF';
        let standardBuffer = new Float32Array(0);

        for (const char of standardData) {
            const bits = char.charCodeAt(0).toString(2).padStart(8, '0').split('').reverse().join('');
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
    } else {
        return repeatAudio(concatAudio(buffer, createSilence(1000)), 3);
    }
}

/**
 * Creates an EOM (End of Message) signal based on the selected mode
 * @param {string} mode - The mode of the EOM signal (default is 'DEFAULT')
 * @returns {Float32Array} - The EOM signal buffer
 */
function createEOM(mode = MODES.DEFAULT) {
    if (mode === MODES.DIGITAL) {
        const eomPart1 = '\x00' + '\xAB'.repeat(16) + 'NNNN' + '\xFF\xFF\xFF';
        const eomPart2 = '\xAB'.repeat(16) + 'NNNN' + '\xFF\xFF\xFF';

        const encodePart = (data) => {
            let buf = new Float32Array(0);
            for (const char of data) {
                const bits = char.charCodeAt(0).toString(2).padStart(8, '0').split('').reverse().join('');
                for (const bit of bits) {
                    buf = concatAudio(buf, bit === '1' ? createMark() : createSpace());
                }
            }
            return buf;
        };

        return concatAudio(
            encodePart(eomPart1),
            createSilence(1000),
            encodePart(eomPart2),
            createSilence(1000),
            encodePart(eomPart2)
        );
    }
    return encodeHeader('\xAB'.repeat(16) + 'NNNN', mode);
}

/**
 * Generates the EAS alert audio with a ZCZC message and optional settings
 * @param {string} zczcMessage - The ZCZC message to encode
 * @param {object} options - Options for the EAS alert generation
 * @returns {Promise<Float32Array>} - The generated EAS alert audio buffer
 */
async function generateEASAlert(zczcMessage, options = {}) {
    const {
        mode: rawMode,
        attentionTone = true,
        audioPath = null,
        outputFile = 'output.wav'
    } = options;

    const mode = (rawMode ?? MODES.DEFAULT).toUpperCase();

    let audioBuffer = new Float32Array(0);
    if (audioPath?.trim()) {
        if (!fs.existsSync(audioPath)) throw new Error(messages?.audioFileNotFound ?? 'Audio file not found.');

        const tempWav = path.resolve('temp_conversion.wav');
        try {
            await execFileAsync(ffmpeg, [
                '-hide_banner', '-y',
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

    let output = concatAudio(
        createSilence(1000),
        encodeHeader('\xAB'.repeat(16) + zczcMessage, mode),
        createSilence(mode === MODES.TRILITHIC ? 150 : 500)
    );

    if (attentionTone) {
        output = concatAudio(output, createAttentionTone(mode), createSilence(1000));
    }

    if ((audioBuffer?.length ?? 0) > 0) {
        output = concatAudio(output, audioBuffer, createSilence(1000));
    }

    const eom = createEOM(mode);
    output = concatAudio(output, eom, createSilence(1000));

    const int16Buffer = new Int16Array(output.length);
    for (let i = 0; i < output.length; i++) {
        int16Buffer[i] = Math.max(-32768, Math.min(32767, output[i] * 32767));
    }

    const outputIsMp3 = outputFile?.toLowerCase().endsWith('.mp3');

    if (outputIsMp3) {
        const tempWav = path.resolve('temp_export.wav');
        try {
            console.log('Creating temporary WAV file for MP3 conversion...');
            const wav = new WaveFile();
            wav.fromScratch(1, SAMPLE_RATE, BIT_DEPTH, int16Buffer);
            fs.writeFileSync(tempWav, wav.toBuffer());

            console.log('Converting WAV to MP3...');
            await execFileAsync(ffmpeg, [
                '-hide_banner', '-y',
                '-i', tempWav,
                '-codec:a', 'libmp3lame',
                '-b:a', '128k',
                path.resolve(outputFile)
            ]);
        } catch (error) {
            console.error('Error during MP3 conversion:', error?.message ?? error);
        } finally {
            if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
        }
    } else {
        const wav = new WaveFile();
        wav.fromScratch(1, SAMPLE_RATE, BIT_DEPTH, int16Buffer);
        fs.writeFileSync(path.resolve(outputFile), wav.toBuffer());
    }

    return output;
}

/**
 * Creates a silence buffer for a given duration
 * @param {number} durationMs - Duration of silence in milliseconds
 * @returns {Float32Array} - The silence audio buffer
 */
const createSilence = (durationMs) => new Float32Array(Math.round((durationMs / 1000) * SAMPLE_RATE));

/**
 * Concatenates multiple audio buffers into one
 * @param {...Float32Array} buffers - The audio buffers to concatenate
 * @returns {Float32Array} - The concatenated audio buffer
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
