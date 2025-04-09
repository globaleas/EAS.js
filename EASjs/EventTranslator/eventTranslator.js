/**
 * Event Code translator for the EASjs library.
 * @module eventTranslator
 */

const fipsData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

/**
 * Translates an Event code to its corresponding event information.
 * @param {string} data - The event code to translate.
 * @returns {string} Translated event name.
 * @throws {Error} If the event code is invalid.
 */
const eventTranslator = (data) => {
    if (typeof data !== 'string' || data.trim() === '') {
        throw new Error(messages.nodata);
    }

    if (data.length !== 3) {
        throw new Error(messages.eventinvalid);
    }

    if (!/^[a-zA-Z]{3}$/.test(data)) {
        throw new Error(messages.invalidcharacters);
    }

    const eventCode = data.toUpperCase();
    const eventResponse = fipsData.EVENTS?.[eventCode];

    if (!eventResponse) {
        throw new Error(messages.eventinvalid);
    }

    return eventResponse;
};

module.exports = eventTranslator;
