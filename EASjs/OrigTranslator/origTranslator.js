/**
 * Originator translator for the EASjs library.
 * @module origTranslator
 */

const fipsData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

/**
 * Translates an Originator code to its corresponding originator information.
 * @param {string} data - The originator code to translate.
 * @returns {string} Translated originator name.
 * @throws {Error} If the originator code is invalid.
 */
const origTranslator = (data) => {
    if (typeof data !== 'string' || data.trim() === '') {
        throw new Error(messages.nodata);
    }

    if (!/^[a-zA-Z]{3}$/.test(data)) {
        throw new Error(messages.originvalid);
    }

    const originCode = data.toUpperCase();
    const originResponse = fipsData.ORGS2?.[originCode];

    if (!originResponse) {
        throw new Error(messages.originvalid);
    }

    return originResponse;
};

module.exports = origTranslator;
