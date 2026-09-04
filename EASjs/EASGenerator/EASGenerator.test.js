const { generateEASAlert, MODES } = require('./EASGenerator');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { WaveFile } = require('wavefile');
const messages = require('./locals/en_us.json');

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
        const buffer = await generateEASAlert('ZCZC-TEST');
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate an EAS alert without attention tone', async () => {
        const buffer = await generateEASAlert('ZCZC-TEST', { attentionTone: false });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate an EAS alert with NWS mode', async () => {
        const buffer = await generateEASAlert('ZCZC-TEST', { mode: MODES.NWS });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid audio file', async () => {
        fs.existsSync.mockImplementation(() => false);
        await expect(
            generateEASAlert('ZCZC-TEST', { audioPath: 'invalid.mp3' })
        ).rejects.toThrow();
    });

    it('should generate alert with WAV output', async () => {
        const buffer = await generateEASAlert('ZCZC-TEST', { outputFile: 'test.wav' });
        expect(buffer).toBeDefined();
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('should use a temporary directory for audio conversion', async () => {
        const wav = new WaveFile();
        wav.fromScratch(1, 24000, '16', new Int16Array([0]));
        fs.readFileSync.mockReturnValue(wav.toBuffer());

        await generateEASAlert('ZCZC-TEST', { audioPath: 'audio.mp3' });

        const tempDirectory = path.join(os.tmpdir(), 'easjs-test');
        expect(fs.promises.mkdtemp).toHaveBeenCalledWith(path.join(os.tmpdir(), 'easjs-'));
        expect(execFile.mock.calls[0][1]).toContain(path.join(tempDirectory, 'conversion.wav'));
        expect(fs.promises.rm).toHaveBeenCalledWith(tempDirectory, { recursive: true, force: true });
    });

    it('should use a temporary directory for MP3 conversion', async () => {
        await generateEASAlert('ZCZC-TEST', { outputFile: 'test.mp3' });

        const tempDirectory = path.join(os.tmpdir(), 'easjs-test');
        expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(tempDirectory, 'export.wav'), expect.anything());
        expect(fs.promises.rm).toHaveBeenCalledWith(tempDirectory, { recursive: true, force: true });
    });

    it('should clean up after audio conversion fails', async () => {
        execFile.mockImplementationOnce((file, args, callback) => callback(new Error('Conversion failed')));

        await expect(
            generateEASAlert('ZCZC-TEST', { audioPath: 'audio.mp3' })
        ).rejects.toThrow(messages.audioConversionFailed);

        expect(fs.promises.rm).toHaveBeenCalledWith(
            path.join(os.tmpdir(), 'easjs-test'),
            { recursive: true, force: true }
        );
    });

    it('should throw an error if MP3 conversion fails', async () => {
        execFile.mockImplementationOnce((file, args, callback) => callback(new Error('Conversion failed')));

        await expect(
            generateEASAlert('ZCZC-TEST', { outputFile: 'test.mp3' })
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
            generateEASAlert('ZCZC-TEST', { outputFile: 'test.wav' })
        ).rejects.toThrow('Write failed');
    });
});
