const {generateEASAlert} = require('./EASGenerator');
const fs = require('fs');

jest.mock('fs');

// these tests are so unbelievably basic, but how do you test this?
describe('EASGenerator', () => {
    beforeEach(() => {
        fs.existsSync.mockClear();
    });

    it('generates an EAS alert with default options', () => {
        const buffer = generateEASAlert('ZCZC-TEST');
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('throws an error if audio file does not exist', () => {
        fs.existsSync.mockReturnValue(false);
        expect(() => generateEASAlert('ZCZC-TEST', {audioPath: 'nonexistent.mp3'})).toThrow();
    });

    it('generates an EAS alert with an additional audio file', () => {
        fs.existsSync.mockReturnValue(true);
        const buffer = generateEASAlert('ZCZC-TEST', {audioPath: 'test.mp3'});
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('generates an EAS alert with attention tone disabled', () => {
        const buffer = generateEASAlert('ZCZC-TEST', {attentionTone: false});
        expect(buffer.length).toBeGreaterThan(0);
    });

    it('generates an EAS alert and outputs to MP3 file', () => {
        const outputFile = 'output.mp3';
        generateEASAlert('ZCZC-TEST', {outputFile});
        expect(fs.existsSync(outputFile)).toBe(true);
        fs.unlinkSync(outputFile);
    });
});