const decodeSame = require('./decodeSame');
const EASData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

describe('decodeSame', () => {
    test('should throw an error if no data is provided', () => {
        expect(() => decodeSame('')).toThrow(messages.nodata);
    });

    test('should throw an error if data is not a string', () => {
        expect(() => decodeSame(123)).toThrow(messages.nodata);
    });

    test('should throw an error if the SAME header is invalid', () => {
        expect(() => decodeSame('INVALID-HEADER')).toThrow(messages.invalidsameheader);
    });

    test('should throw an error if the ZCZC start string is missing', () => {
        expect(() => decodeSame('-WXR-SQW-027133+0100-3441441-ERN/CRTV-')).toThrow(messages.zczcnotfound);
    });

    test('should throw an error if organization code is invalid', () => {
        const invalidHeader = 'ZCZC-WHA-SQW-027133+0100-3441441-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader)).toThrow(messages.orgcodeinvalid);
    });

    test('should throw an error if event code is invalid', () => {
        const invalidHeader = 'ZCZC-WXR-AAA-027133+0100-3441441-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader)).toThrow(messages.eventcodeinvalid);
    });

    test('should throw an error if FIPS code is invalid', () => {
        const invalidHeader = 'ZCZC-WXR-SQW-0273+0100-3441441-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader)).toThrow(messages.fipsinvalid);
    });

    test('should throw an error if time is invalid', () => {
        const invalidHeader = 'ZCZC-WXR-SQW-027133+0100-344-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader)). toThrow(messages.datetimeinvalid);
    });

    test('should throw an error if the expire time is invalid', () => {
        const invalidHeader = 'ZCZC-WXR-SQW-027133+010-3441441-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader)). toThrow(messages.expiretimeinvalid);
    });

    test('should decode a valid SAME header', () => {
        const validHeader = 'ZCZC-WXR-SQW-027133+0100-3441441-ERN/CRTV-';
        const result = decodeSame(validHeader);
        expect(result).toEqual({
            organization: EASData.ORGS['WXR'],
            event: EASData.EVENTS['SQW'],
            locations: 'Rock, MN',
            timing: {
                start: expect.any(String),
                end: expect.any(String),
            },
            sender: 'ERN/CRTV',
            formatted: expect.any(String),
        });
    });
});