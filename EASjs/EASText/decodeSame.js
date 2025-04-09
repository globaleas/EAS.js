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
const decodeSame = (data) => {
    if (typeof data !== 'string' || data.trim() === '') {
        throw new Error(messages.nodata);
    }

    const cleanData = data.endsWith('-') ? data.slice(0, -1) : data;
    const parts = cleanData.split('-');

    validateHeader(parts);

    const orgInfo = parseOrgCode(parts[1]);
    const eventInfo = parseEventCode(parts[2]);
    const { locations, startTime, endTime, sender } = parseFipsAndTime(parts);

    return formatResponse(orgInfo, eventInfo, locations, startTime, endTime, sender);
};

/**
 * Validates the SAME header parts.
 * @param {string[]} parts - The parts of the SAME header.
 * @throws {Error} If the SAME header is invalid.
 */
const validateHeader = (parts) => {
    if (!Array.isArray(parts) || parts.length < 5) {
        throw new Error(messages.invalidsameheader);
    }
    if (parts[0] !== 'ZCZC') {
        throw new Error(messages.zczcnotfound);
    }
};

/**
 * Parses the organization code from the SAME header.
 * @param {string} orgCode - The organization code.
 * @returns {string} The organization information.
 * @throws {Error} If the organization code is invalid.
 */
const parseOrgCode = (orgCode) => {
    const org = EASData.ORGS?.[orgCode];
    if (!org) throw new Error(messages.orgcodeinvalid);
    return org;
};

/**
 * Parses the event code from the SAME header.
 * @param {string} eventCode - The event code.
 * @returns {string} The event information.
 * @throws {Error} If the event code is invalid.
 */
const parseEventCode = (eventCode) => {
    const event = EASData.EVENTS?.[eventCode];
    if (!event) throw new Error(messages.eventcodeinvalid);
    return event;
};

/**
 * Parses the FIPS codes and time from the SAME header.
 * @param {string[]} parts - The parts of the SAME header.
 * @returns {object} The parsed locations, start time, end time, and sender.
 * @throws {Error} If the FIPS codes or time are invalid.
 */
const parseFipsAndTime = (parts) => {
    const fipsCodes = [];
    let timeOffset = null;
    let senderIndex = 0;

    for (let i = 3; i < parts.length; i++) {
        if (parts[i].includes('+')) {
            const [fipsCode, time] = parts[i].split('+');
            fipsCodes.push(fipsCode);
            timeOffset = time;
            senderIndex = i + 1;
            break;
        }
        fipsCodes.push(parts[i]);
    }

    if (!timeOffset) throw new Error(messages.expiretimeinvalid);

    const timeString = parts[senderIndex] ?? '';
    if (timeString.length !== 7) throw new Error(messages.datetimeinvalid);

    const currentYear = new Date().getFullYear();
    const julianDay = parseInt(timeString.slice(0, 3), 10);
    const hour = parseInt(timeString.slice(3, 5), 10);
    const minute = parseInt(timeString.slice(5, 7), 10);

    const isLeapYear = (year) =>
        year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

    const julianToDate = (julianDay, year) => {
        const maxDays = isLeapYear(year) ? 366 : 365;
        if (julianDay < 1 || julianDay > maxDays) {
            throw new Error(messages.datetimeinvalid);
        }
        const date = new Date(year - 1, 11, 31);
        date.setDate(date.getDate() + julianDay);
        return date;
    };

    const startTime = julianToDate(julianDay, currentYear);
    startTime.setUTCHours(hour, minute, 0, 0);

    if (timeOffset.length !== 4) throw new Error(messages.expiretimeinvalid);
    const expireHours = parseInt(timeOffset.slice(0, 2), 10);
    const expireMinutes = parseInt(timeOffset.slice(2), 10);
    const endTime = new Date(startTime.getTime() + (expireHours * 60 + expireMinutes) * 60 * 1000);

    const locations = fipsCodes.map((code) => {
        const subdiv = code.slice(0, 1);
        const loccode = code.slice(1, 6);

        const subdivName = EASData.SUBDIV?.[subdiv];
        const sameLoc = EASData.SAME?.[loccode];

        if (!subdivName && subdiv !== "0") {
            throw new Error(`${messages.fipsinvalid} (${code})`);
        }

        if (!sameLoc) {
            throw new Error(`${messages.fipsinvalid} (${code})`);
        }

        return `${subdiv === "0" ? "" : subdivName}${sameLoc}`;
    });

    const senderParts = parts.slice(senderIndex);
    const sender = senderParts.join('-').split('-').slice(1).join('-');

    return { locations, startTime, endTime, sender };
};

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
const formatResponse = (org, event, locations, startTime, endTime, sender) => {
    const formatTime = (date) => {
        const options = { hour: 'numeric', minute: 'numeric', hour12: true };
        const time = date.toLocaleTimeString('en-US', options);
        const month = date.toLocaleString('default', { month: 'long' });
        const day = date.getDate();
        return `${time} on ${month} ${day}`;
    };

    return {
        organization: org,
        event,
        locations: locations.join('; '),
        timing: {
            start: formatTime(startTime),
            end: formatTime(endTime)
        },
        sender,
        formatted: `${org}a ${event} for ${locations.join('; ')}; beginning at ${formatTime(startTime)} and ending at ${formatTime(endTime)}. Message from ${sender}`
    };
};

module.exports = decodeSame;
