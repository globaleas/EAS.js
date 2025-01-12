const eventTranslator = require('./eventTranslator');
const messages = require('./locals/en_us.json');
const fipsData = require('../../EASData.json');

describe('eventTranslator', () => {
    it('returns the correct event name for a valid event code', () => {
        const eventCode = 'TOR';
        const expectedEventName = fipsData.EVENTS[eventCode];
        expect(eventTranslator(eventCode)).toBe(expectedEventName);
    });

    it('throws an error if no data is provided', () => {
        expect(() => eventTranslator()).toThrow(messages.nodata);
    });

    it('throws an error if the event code is not a string', () => {
        expect(() => eventTranslator(123)).toThrow(messages.nodata);
    });

    it('throws an error if the event code length is not 3', () => {
        expect(() => eventTranslator('TO')).toThrow(messages.eventinvalid);
        expect(() => eventTranslator('TORN')).toThrow(messages.eventinvalid);
    });

    it('throws an error if the event code contains invalid characters', () => {
        expect(() => eventTranslator('T0R')).toThrow(messages.invalidcharacters);
        expect(() => eventTranslator('T@R')).toThrow(messages.invalidcharacters);
    });

    it('throws an error if the event code is not found in fipsData', () => {
        expect(() => eventTranslator('XYZ')).toThrow(messages.eventinvalid);
    });
});