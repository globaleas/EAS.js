/**
 * FIPS code to county name translator for the EASjs library.
 * @module translateFips
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
const translateFips = (data) => {
    if (typeof data !== 'string' || data.trim() === '') {
        throw new Error(messages.nodata);
    }

    if (!/^\d{6}$/.test(data)) {
        throw new Error(messages.fipsinvalid);
    }

    const subdivisionCode = data[0];
    const fipsCode = data.slice(1, 6);
    const dataResponse = fipsData.SAME?.[fipsCode];

    if (!dataResponse) {
        throw new Error(messages.fipsinvalid);
    }

    const subdivision = subdivisionCode === '0'
        ? fipsData.SUBDIV?.[subdivisionCode] ?? 'All'
        : fipsData.SUBDIV?.[subdivisionCode];

    if (!subdivision) {
        throw new Error(messages.subdivisioninvalid);
    }

    const isStatewide = fipsCode.endsWith('000');
    const [countyRaw, regionRaw] = dataResponse.split(',');

    if (!countyRaw) {
        throw new Error(messages.fipsinvalid);
    }

    const county = countyRaw.trim();
    const region = isStatewide ? county : regionRaw?.trim() ?? 'Unknown';

    const formatted = isStatewide
        ? `${subdivision} of ${county}`
        : `${subdivision} ${county}, ${region}`;

    return {
        subdivision,
        county,
        region,
        formatted,
    };
};

module.exports = translateFips;
