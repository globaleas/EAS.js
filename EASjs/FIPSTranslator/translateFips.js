/**
 *  FIPS code to county name translator for the EASjs library.
 *  @module translateFips
 */
const fipsData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

/**
 * Translates a FIPS code to its corresponding county and region.
 *
 * @param {string} data - The FIPS code to translate.
 * @returns {object} Translated FIPS information.
 * @throws {Error} If the FIPS code is invalid.
 */
function translateFips(data) {
    if (!data || typeof data !== 'string') {
        throw new Error(messages.nodata);
    }
    if (data.length !== 6) {
        throw new Error(messages.fipsinvalid);
    }
    if (!/^\d{6}$/.test(data)) {
        throw new Error(messages.invalidcharacters);
    }

    const subdivisionCode = data.slice(0,1);
    const fipsCode = data.slice(1, 6);

    const dataResponse = fipsData.SAME[fipsCode];
    if (!dataResponse) {
        throw new Error(messages.fipsinvalid);
    }

    const subdivision = subdivisionCode === '0' ? (fipsData.SUBDIV[subdivisionCode] || "All") : fipsData.SUBDIV[subdivisionCode];
    const county = dataResponse.split(',')[0];
    const region = dataResponse.split(',')[1].trim();

    if (!subdivision) {
        throw new Error(messages.subdivisioninvalid)
    }
    if (!county) {
        throw new Error(messages.fipsinvalid);
    }

    return {
        subdivision: subdivision,
        county: county,
        region: region,
        formatted: `${subdivision} ${county}, ${region}`,
    }
}

module.exports = translateFips;