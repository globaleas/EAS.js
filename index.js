/**
 * Modules to be exported from the EASjs library.
 */
const translateFips = require('./EASjs/FIPSTranslator/translateFips.js');
const decodeSame = require('./EASjs/EASText/decodeSame.js');
const eventTranslator = require('./EASjs/EventTranslator/eventTranslator.js');

/**
 * Exports all functions from the EASjs library.
 * @module index
 */
module.exports = {
    translateFips,
    decodeSame,
    eventTranslator
}