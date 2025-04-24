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
 * Generates a sine wave buffer for a given frequency, duration, and volume.
 * @param {number} freq - The frequency of the sine wave in Hz.
 * @param {number} durationMs - The duration of the sine wave in milliseconds.
 * @param {number} [volumeDB=0] - The volume of the sine wave in decibels.
 * @returns {Float32Array} The generated sine wave buffer.
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
 * Creates the "Mark" tone (2083.3 Hz).
 * @returns {Float32Array} The generated mark tone buffer.
 */
const createMark = () => generateSine(2083.3, 1000 / 520.83, -3);

/**
 * Creates the "Space" tone (1562.5 Hz).
 * @returns {Float32Array} The generated space tone buffer.
 */
const createSpace = () => generateSine(1562.5, 1000 / 520.83, -3);

/**
 * Creates the attention tone for the given mode.
 * @param {string} [mode=MODES.DEFAULT] - The mode for which the attention tone is generated.
 * @returns {Float32Array} The generated attention tone buffer.
 */
function createAttentionTone(mode = MODES.DEFAULT) {
    switch (mode) {
        case MODES.NWS:
            return generateSine(1050, 9000, -4);
        default: {
            const tone1 = generateSine(853, 8000, -10);
            const tone2 = generateSine(960, 8000, -10);
            const mixed = new Float32Array(tone1.length);
            for (let i = 0; i < mixed.length; i++) {
                mixed[i] = 0.5 * (tone1[i] + tone2[i]);
            }
            return mixed;
        }
    }
}

/**
 * Encodes the header of the message for the given mode.
 * @param {string} data - The message data to encode.
 * @param {string} [mode=MODES.DEFAULT] - The mode for which the message is encoded.
 * @returns {Float32Array} The encoded message header.
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
        // Only use 868ms if mode is TRILITHIC, otherwise 1000ms
        const silenceDuration = mode === MODES.TRILITHIC ? 868 : 1000;
        return concatAudio(
            buffer,
            createSilence(silenceDuration),
            buffer,
            createSilence(silenceDuration),
            buffer
        )
    }
}

/**
 * Creates the End of Message (EOM) signal for the given mode.
 * @param {string} [mode=MODES.DEFAULT] - The mode for which the EOM is created.
 * @returns {Float32Array} The generated EOM buffer.
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
 * Generates an EAS alert with a specified message.
 * @param {string} zczcMessage - The ZCZC message for the alert.
 * @param {Object} [options={}] - Options for the alert generation.
 * @param {string} [options.mode=MODES.DEFAULT] - The mode for the alert.
 * @param {boolean} [options.attentionTone=true] - Whether to include the attention tone.
 * @param {string} [options.audioPath=null] - Path to an audio file to include in the alert.
 * @param {string} [options.outputFile='output.wav'] - The output file name for the alert.
 * @returns {Promise<Float32Array>} The generated EAS alert audio buffer.
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
        createSilence(MODES.TRILITHIC ? 1118: 1000)
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
 * Creates a silence buffer of the specified duration.
 * @param {number} durationMs - The duration of the silence in milliseconds.
 * @returns {Float32Array} The silence buffer.
 */
const createSilence = (durationMs) => new Float32Array(Math.round((durationMs / 1000) * SAMPLE_RATE));

/**
 * Concatenates multiple audio buffers into one.
 * @param {...Float32Array} buffers - The buffers to concatenate.
 * @returns {Float32Array} The concatenated audio buffer.
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