const { generateEASAlert, MODES } = require('./EASGenerator');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { WaveFile } = require('wavefile');
const messages = require('./locals/en_us.json');
const validHeader = 'ZCZC-WXR-SQW-027133+0100-3441441-ERN/CRTV-';

// Mock fs module
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    promises: {
        mkdtemp: jest.fn(),
        rm: jest.fn()
    }
}));

jest.mock('child_process', () => ({
    execFile: jest.fn((file, args, callback) => callback(null))
}));

describe('EASGenerator', () => {
    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();

        // Mock fs.existsSync to return true by default
        fs.existsSync.mockImplementation(() => true);
        fs.promises.mkdtemp.mockResolvedValue(path.join(os.tmpdir(), 'easjs-test'));
        fs.promises.rm.mockResolvedValue();
    });

    it('should generate an EAS alert with default options', async () => {
        const buffer = await generateEASAlert(validHeader);
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate an EAS alert without attention tone', async () => {
        const buffer = await generateEASAlert(validHeader, { attentionTone: false });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate an EAS alert with NWS mode', async () => {
        const buffer = await generateEASAlert(validHeader, { mode: MODES.NWS });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid audio file', async () => {
        fs.existsSync.mockImplementation(() => false);
        await expect(
            generateEASAlert(validHeader, { audioPath: 'invalid.mp3' })
        ).rejects.toThrow('Audio file not found: invalid.mp3');
    });

    it('should generate alert with WAV output', async () => {
        const buffer = await generateEASAlert(validHeader, { outputFile: 'test.wav' });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should accept the deprecated format option', async () => {
        const buffer = await generateEASAlert(validHeader, { format: 'wav' });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should use a temporary directory for audio conversion', async () => {
        const wav = new WaveFile();
        wav.fromScratch(1, 24000, '16', new Int16Array([0]));
        fs.readFileSync.mockReturnValue(wav.toBuffer());

        await generateEASAlert(validHeader, { audioPath: 'audio.mp3' });

        const tempDirectory = path.join(os.tmpdir(), 'easjs-test');
        expect(fs.promises.mkdtemp).toHaveBeenCalledWith(path.join(os.tmpdir(), 'easjs-'));
        expect(execFile.mock.calls[0][1]).toContain(path.join(tempDirectory, 'conversion.wav'));
        expect(fs.promises.rm).toHaveBeenCalledWith(tempDirectory, { recursive: true, force: true });
    });

    it('should use a temporary directory for MP3 conversion', async () => {
        await generateEASAlert(validHeader, { outputFile: 'test.mp3' });

        const tempDirectory = path.join(os.tmpdir(), 'easjs-test');
        expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(tempDirectory, 'export.wav'), expect.anything());
        expect(fs.promises.rm).toHaveBeenCalledWith(tempDirectory, { recursive: true, force: true });
    });

    it('should clean up after audio conversion fails', async () => {
        execFile.mockImplementationOnce((file, args, callback) => callback(new Error('Conversion failed')));
        fs.promises.rm.mockRejectedValueOnce(new Error('Cleanup failed'));

        await expect(
            generateEASAlert(validHeader, { audioPath: 'audio.mp3' })
        ).rejects.toThrow(messages.audioConversionFailed);

        expect(fs.promises.rm).toHaveBeenCalledWith(
            path.join(os.tmpdir(), 'easjs-test'),
            { recursive: true, force: true }
        );
    });

    it('should throw an error if MP3 conversion fails', async () => {
        execFile.mockImplementationOnce((file, args, callback) => callback(new Error('Conversion failed')));
        fs.promises.rm.mockRejectedValueOnce(new Error('Cleanup failed'));

        await expect(
            generateEASAlert(validHeader, { outputFile: 'test.mp3' })
        ).rejects.toThrow(messages.outputConversionFailed);

        expect(fs.promises.rm).toHaveBeenCalledWith(
            path.join(os.tmpdir(), 'easjs-test'),
            { recursive: true, force: true }
        );
    });

    it('should throw an error if writing output fails', async () => {
        fs.writeFileSync.mockImplementationOnce(() => {
            throw new Error('Write failed');
        });

        await expect(
            generateEASAlert(validHeader, { outputFile: 'test.wav' })
        ).rejects.toThrow('Write failed');
    });

    it('should throw an error if the SAME header is invalid', async () => {
        await expect(generateEASAlert('ZCZC-TEST')).rejects.toThrow();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should throw an error if the mode is invalid', async () => {
        await expect(generateEASAlert(validHeader, { mode: 'INVALID' })).rejects.toThrow(messages.invalidMode);
        await expect(generateEASAlert(validHeader, { mode: 1 })).rejects.toThrow(messages.invalidMode);
    });

    it('should accept a SAME header without a final dash', async () => {
        const buffer = await generateEASAlert(validHeader.slice(0, -1));
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should pad a sender shorter than eight characters', async () => {
        const shortHeader = 'ZCZC-WXR-ADR-040059-040153-040151+0045-1142248-ERN/KLT-';
        const shortBuffer = await generateEASAlert(shortHeader);
        const paddedBuffer = await generateEASAlert(shortHeader.replace('ERN/KLT-', 'ERN/KLT -'));
        expect(shortBuffer.length).toBe(paddedBuffer.length);
    });
});
