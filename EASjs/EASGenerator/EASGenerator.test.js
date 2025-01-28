const { generateEASAlert, MODES } = require('./EASGenerator');
const fs = require('fs');

// Mock fs module
jest.mock('fs');

describe('EASGenerator', () => {
    beforeEach(() => {
        // Clear mocks before each test
        jest.clearAllMocks();

        // Mock fs.existsSync to return true by default
        fs.existsSync.mockImplementation(() => true);
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
});