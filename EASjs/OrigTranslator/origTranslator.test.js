const origTranslator = require('./origTranslator.js');
const messages = require('./locals/en_us.json');
const fipsData = require('../../EASData.json');

describe('origTranslator', () => {
    it('returns the correct originator name for a valid code', () => {
        const result = origTranslator('WXR');
        expect(result).toBe(fipsData.ORGS2['WXR']);
    });

    it('throws an error if no data is provided', () => {
        expect(() => origTranslator()).toThrow(messages.nodata);
    });

    it('throws an error if data is not a string', () => {
        expect(() => origTranslator(123)).toThrow(messages.nodata);
    });

    it('throws an error if data length is not 3', () => {
        expect(() => origTranslator('ab')).toThrow(messages.originvalid);
        expect(() => origTranslator('abcd')).toThrow(messages.originvalid);
    });

    it('throws an error if data contains invalid characters', () => {
        expect(() => origTranslator('N#R')).toThrow(messages.invalidcharacters);
        expect(() => origTranslator('C3M')).toThrow(messages.invalidcharacters);
    });

    it('throws an error if the originator code is not found', () => {
        expect(() => origTranslator('xyz')).toThrow(messages.originvalid);
    });

});