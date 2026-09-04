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

    test('should throw an error if time contains invalid values', () => {
        expect(() => decodeSame('ZCZC-WXR-SQW-027133+0100-ABC1441-ERN/CRTV-')).toThrow(messages.datetimeinvalid);
        expect(() => decodeSame('ZCZC-WXR-SQW-027133+0100-3442460-ERN/CRTV-')).toThrow(messages.datetimeinvalid);
    });

    test('should throw an error if the expire time is invalid', () => {
        const invalidHeader = 'ZCZC-WXR-SQW-027133+010-3441441-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader)). toThrow(messages.expiretimeinvalid);
    });

    test('should throw an error if the expire time is not a valid increment', () => {
        expect(() => decodeSame('ZCZC-WXR-SQW-027133+0115-3441441-ERN/CRTV-')).toThrow(messages.expiretimeinvalid);
        expect(() => decodeSame('ZCZC-WXR-SQW-027133+9999-3441441-ERN/CRTV-')).toThrow(messages.expiretimeinvalid);
    });

    test('should throw an error if there are too many FIPS codes', () => {
        const locations = Array(32).fill('027133').join('-');
        expect(() => decodeSame(`ZCZC-WXR-SQW-${locations}+0100-3441441-ERN/CRTV-`)).toThrow(messages.fipsinvalid);
    });

    test('should throw an error if a FIPS code contains trailing characters', () => {
        expect(() => decodeSame('ZCZC-WXR-SQW-027133ABC+0100-3441441-ERN/CRTV-')).toThrow(messages.fipsinvalid);
    });

    test('should throw an error if the sender is invalid', () => {
        expect(() => decodeSame('ZCZC-WXR-SQW-027133+0100-3441441-')).toThrow(messages.senderinvalid);
        expect(() => decodeSame('ZCZC-WXR-SQW-027133+0100-3441441-TOOLONGID-')).toThrow(messages.senderinvalid);
    });

    test('should decode a sender shorter than eight characters', () => {
        const result = decodeSame('ZCZC-WXR-ADR-040059-040153-040151+0045-1142248-ERN/KLT-');
        expect(result.sender).toBe('ERN/KLT');
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

    test('should decode a valid SAME header without a final dash', () => {
        const result = decodeSame('ZCZC-WXR-SQW-027133+0100-3441441-ERN/CRTV');
        expect(result.sender).toBe('ERN/CRTV');
    });

    test('should decode time in UTC', () => {
        const validHeader = 'ZCZC-WXR-SQW-027133+0100-0010030-ERN/CRTV-';
        const timezone = process.env.TZ;
        process.env.TZ = 'America/Denver';
        try {
            const result = decodeSame(validHeader, { year: 2026 });
            expect(result.timing).toEqual({
                start: '12:30 AM on January 1',
                end: '1:30 AM on January 1',
            });
        } finally {
            process.env.TZ = timezone;
        }
    });

    test('should resolve the year from a reference date', () => {
        const validHeader = 'ZCZC-WXR-SQW-027133+0100-0602330-ERN/CRTV-';
        const result = decodeSame(validHeader, { referenceDate: '2024-02-29T23:30:00Z' });
        expect(result.timing).toEqual({
            start: '11:30 PM on February 29',
            end: '12:30 AM on March 1',
        });
    });

    test('should reject an invalid Julian day for an explicit year', () => {
        const invalidHeader = 'ZCZC-WXR-SQW-027133+0100-3661200-ERN/CRTV-';
        expect(() => decodeSame(invalidHeader, { year: 2025 })).toThrow(messages.datetimeinvalid);
    });
});
