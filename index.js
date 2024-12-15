/**
 * Module dependencies
 */
const translateFips = require('./EASjs/FIPSTranslator/translateFips.js');
const decodeSame = require('./EASjs/EASText/decodeSame.js');

/**
 * Exports the translateFips and decodeSame functions
 * @module index
 */
module.exports = {
    translateFips,
    decodeSame
}