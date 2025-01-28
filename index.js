/**
 * Modules to be exported from the EASjs library.
 */
const translateFips = require('./EASjs/FIPSTranslator/translateFips.js');
const decodeSame = require('./EASjs/EASText/decodeSame.js');
const eventTranslator = require('./EASjs/EventTranslator/eventTranslator.js');
const origTranslator = require('./EASjs/OrigTranslator/origTranslator.js');
const { generateEASAlert, MODES } = require('./EASjs/EASGenerator/EASGenerator');

/**
 * Exports all functions from the EASjs library.
 * @module index
 */
module.exports = {
    translateFips,
    decodeSame,
    eventTranslator,
    origTranslator,
    generateEASAlert,
    MODES
}