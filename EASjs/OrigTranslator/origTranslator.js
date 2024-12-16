/**
 *  Originator translator for the EASjs library.
 *  @module origTranslator
 */
const fipsData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

/**
 * Translates an Originator code to its corresponding originator information.
 * @param {string} data - The originator code to translate.
 * @returns {string} Translated originator name.
 * @throws {Error} If the originator code is invalid.
 */
function origTranslator(data){
    if (!data || typeof data !== 'string') {
        throw new Error(messages.nodata);
    }
    if (data.length !== 3) {
        throw new Error(messages.originvalid);
    }
    if (/[^a-zA-Z]/.test(data)) {
        throw new Error(messages.invalidcharacters);
    }

    const originCode = data.toUpperCase();
    const originResponse = fipsData.ORGS[originCode];
    if (!originResponse) {
        throw new Error(messages.originvalid);
    }
    return originResponse;
}

module.exports = origTranslator;