/**
 * EAS to Text Translator for the EASjs library
 * @module decodeSame
 */

const EASData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

/**
 * Decodes a SAME (Specific Area Message Encoding) header.
 * @param {string} data - The SAME header to decode.
 * @returns {object} Decoded SAME header information.
 * @throws {Error} If the SAME header format is invalid.
 */
function decodeSame(data) {
    if (!data || typeof data !== 'string') {
        throw new Error(messages.nodata);
    }

    const cleanData = data.endsWith('-') ? data.slice(0, -1) : data;
    const parts = cleanData.split('-');

    validateHeader(parts);

    const orgInfo = parseOrgCode(parts[1]);
    const eventInfo = parseEventCode(parts[2]);
    const { locations, startTime, endTime, sender } = parseFipsAndTime(parts);

    return formatResponse(orgInfo, eventInfo, locations, startTime, endTime, sender);
}

/**
 * Validates the SAME header parts.
 * @param {string[]} parts - The parts of the SAME header.
 * @throws {Error} If the SAME header is invalid.
 */
function validateHeader(parts) {
    if (!Array.isArray(parts) || parts.length < 5) {
        throw new Error(messages.invalidsameheader);
    }
    if (parts[0] !== 'ZCZC') {
        throw new Error(messages.zczcnotfound);
    }
}

/**
 * Parses the organization code from the SAME header.
 * @param {string} orgCode - The organization code.
 * @returns {string} The organization information.
 * @throws {Error} If the organization code is invalid.
 */
function parseOrgCode(orgCode) {
    if (!EASData.ORGS?.[orgCode]) {
        throw new Error(messages.orgcodeinvalid);
    }
    return EASData.ORGS[orgCode];
}

/**
 * Parses the event code from the SAME header.
 * @param {string} eventCode - The event code.
 * @returns {string} The event information.
 * @throws {Error} If the event code is invalid.
 */
function parseEventCode(eventCode) {
    if (!EASData.EVENTS?.[eventCode]) {
        throw new Error(messages.eventcodeinvalid);
    }
    return EASData.EVENTS[eventCode];
}

/**
 * Parses the FIPS codes and time from the SAME header.
 * @param {string[]} parts - The parts of the SAME header.
 * @returns {object} The parsed locations, start time, end time, and sender.
 * @throws {Error} If the FIPS codes or time are invalid.
 */
function parseFipsAndTime(parts) {
    let fipsCodes = [];
    let timeOffset = null;
    let senderIndex = 0;

    for (let i = 3; i < parts.length; i++) {
        if (parts[i].includes('+')) {
            const [fipsCode, time] = parts[i].split('+');
            fipsCodes.push(fipsCode);
            timeOffset = time;
            senderIndex = i + 1;
            break;
        } else {
            fipsCodes.push(parts[i]);
        }
    }

    if (!timeOffset) {
        throw new Error(messages.expiretimeinvalid);
    }

    const timeString = parts[senderIndex]; // e.g., "3371800"
    if (timeString.length !== 7) {
        throw new Error(messages.datetimeinvalid);
    }

    const currentYear = new Date().getFullYear();
    const julianDay = parseInt(timeString.substring(0, 3), 10);
    const hour = parseInt(timeString.substring(3, 5), 10);
    const minute = parseInt(timeString.substring(5, 7), 10);

    const isLeapYear = (year) => {
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    };

    function julianToDate(julianDay, year) {
        const date = new Date(year - 1, 11, 31);

        const maxDays = isLeapYear(year) ? 366 : 365;
        if (julianDay < 1 || julianDay > maxDays) {
            throw new Error(messages.datetimeinvalid);
        }

        date.setDate(date.getDate() + julianDay);
        return date;
    }

    const startTime = julianToDate(julianDay, currentYear);
    startTime.setUTCHours(hour, minute, 0, 0);

    if (timeOffset.length !== 4) {
        throw new Error(messages.expiretimeinvalid);
    }
    const expireHours = parseInt(timeOffset.substring(0, 2), 10);
    const expireMinutes = parseInt(timeOffset.substring(2), 10);
    const endTime = new Date(startTime.getTime() + (expireHours * 60 + expireMinutes) * 60 * 1000);

    let locations = [];
    for (let code of fipsCodes) {
        let subdiv = code.slice(0, 1);
        let loccode = code.slice(1, 6);

        if (!(subdiv in EASData.SUBDIV)) {
            throw new Error(`${messages.fipsinvalid} (${code})`);
        }

        if (!EASData.SAME[loccode]) {
            throw new Error(`${messages.fipsinvalid} (${code})`);
        }

        const subdivText = subdiv === "0" ? "" : EASData.SUBDIV[subdiv];
        locations.push(`${subdivText}${EASData.SAME[loccode]}`);
    }

    const senderParts = parts.slice(senderIndex);
    const fullSender = senderParts.join('-');
    const sender = fullSender.split('-').slice(1).join('-');

    return { locations, startTime, endTime, sender };
}

/**
 * Formats the response with the decoded SAME header information.
 * @param {string} org - The organization information.
 * @param {string} event - The event information.
 * @param {string[]} locations - The locations.
 * @param {Date} startTime - The start time.
 * @param {Date} endTime - The end time.
 * @param {string} sender - The sender information.
 * @returns {object} The formatted response.
 */
function formatResponse(org, event, locations, startTime, endTime, sender) {
    const formatTime = (date) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        
        const time = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });

        return `${time} on ${month} ${day}`;
    };

    return {
        organization: org,
        event: event,
        locations: locations.join('; '),
        timing: {
            start: formatTime(startTime),
            end: formatTime(endTime)
        },
        sender: sender,
        formatted: `${org}a ${event} for ${locations.join('; ')}; beginning at ${formatTime(startTime)} and ending at ${formatTime(endTime)}. Message from ${sender}`
    };
}

module.exports = decodeSame;