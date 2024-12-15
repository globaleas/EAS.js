const translateFips = require('./translateFips');
const messages = require('./locals/en_us.json');

describe('translateFips', () => {
    it('should translate a valid FIPS code to county and region', () => {
        const result = translateFips('030013');
        expect(result).toEqual({
            subdivision: 'All',
            county: 'Cascade',
            region: 'MT',
            formatted: 'All Cascade, MT'
        });
    });

    it('should throw an error if no data is provided', () => {
        expect(() => translateFips()).toThrow(messages.nodata);
    });

    it('should throw an error if the FIPS code is not a string', () => {
        expect(() => translateFips(123456)).toThrow(messages.nodata);
    });

    it('should throw an error if the FIPS code length is not 6', () => {
        expect(() => translateFips('12345')).toThrow(messages.fipsinvalid);
        expect(() => translateFips('1234567')).toThrow(messages.fipsinvalid);
    });

    it('should throw an error if the FIPS code is invalid', () => {
        expect(() => translateFips('000001')).toThrow(messages.fipsinvalid);
    });

    it('should throw an error if any characters other than numbers are entered', () => {
        expect(() => translateFips('A30013')).toThrow(messages.invalidcharacters);
        expect(() => translateFips('AAAAAA')).toThrow(messages.invalidcharacters);
    });
});