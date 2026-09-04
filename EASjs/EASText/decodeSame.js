/**
 * EAS to Text Translator for the EASjs library
 * @module decodeSame
 */

const EASData = require('../../EASData.json');
const messages = require('./locals/en_us.json');

/**
 * Decodes a SAME (Specific Area Message Encoding) header.
 * @param {string} data - The SAME header to decode.
 * @param {Object} [options={}] - Options for decoding the header.
 * @param {Date|string|number} [options.referenceDate] - Date used to resolve the header year.
 * @param {number} [options.year] - Explicit year for the header.
 * @returns {object} Decoded SAME header information.
 * @throws {Error} If the SAME header format is invalid.
 */
const decodeSame = (data, options = {}) => {
    if (typeof data !== 'string' || data.trim() === '') {
        throw new Error(messages.nodata);
    }

    const cleanData = data.endsWith('-') ? data : `${data}-`;
    const parts = cleanData.slice(0, -1).split('-');

    validateHeader(parts);

    const orgInfo = parseOrgCode(parts[1]);
    const eventInfo = parseEventCode(parts[2]);
    const { locations, startTime, endTime, sender } = parseFipsAndTime(parts, options);

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
    if (!/^[A-Z]{3}$/.test(orgCode) || !org) throw new Error(messages.orgcodeinvalid);
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
    if (!/^[A-Z]{3}$/.test(eventCode) || !event) throw new Error(messages.eventcodeinvalid);
    return event;
};

/**
 * Parses the FIPS codes and time from the SAME header.
 * @param {string[]} parts - The parts of the SAME header.
 * @param {Object} options - Options for decoding the header.
 * @returns {object} The parsed locations, start time, end time, and sender.
 * @throws {Error} If the FIPS codes or time are invalid.
 */
const parseFipsAndTime = (parts, options) => {
    const fipsCodes = [];
    let timeOffset = null;
    let senderIndex = 0;

    for (let i = 3; i < parts.length; i++) {
        if (parts[i].includes('+')) {
            const timeParts = parts[i].split('+');
            if (timeParts.length !== 2) throw new Error(messages.expiretimeinvalid);

            const [fipsCode, time] = timeParts;
            fipsCodes.push(fipsCode);
            timeOffset = time;
            senderIndex = i + 1;
            break;
        }
        fipsCodes.push(parts[i]);
    }

    if (!timeOffset) throw new Error(messages.expiretimeinvalid);
    if (fipsCodes.length === 0 || fipsCodes.length > 31 ||
        fipsCodes.some((code) => !/^\d{6}$/.test(code))) {
        throw new Error(messages.fipsinvalid);
    }

    if (!/^\d{4}$/.test(timeOffset)) throw new Error(messages.expiretimeinvalid);
    const expireHours = parseInt(timeOffset.slice(0, 2), 10);
    const expireMinutes = parseInt(timeOffset.slice(2), 10);
    const validDuration =
        expireHours === 0 && [15, 30, 45].includes(expireMinutes) ||
        expireHours >= 1 && expireHours < 6 && [0, 30].includes(expireMinutes) ||
        expireHours === 6 && expireMinutes === 0;

    if (!validDuration) throw new Error(messages.expiretimeinvalid);

    const timeString = parts[senderIndex] ?? '';
    if (!/^\d{7}$/.test(timeString)) throw new Error(messages.datetimeinvalid);

    const julianDay = parseInt(timeString.slice(0, 3), 10);
    const hour = parseInt(timeString.slice(3, 5), 10);
    const minute = parseInt(timeString.slice(5, 7), 10);

    if (hour > 23 || minute > 59) throw new Error(messages.datetimeinvalid);

    const isLeapYear = (year) =>
        year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

    const referenceDate = new Date(options.referenceDate ?? Date.now());
    if (Number.isNaN(referenceDate.getTime())) throw new Error(messages.datetimeinvalid);

    if (options.year !== undefined &&
        (!Number.isInteger(options.year) || options.year < 1000 || options.year > 9999)) {
        throw new Error(messages.datetimeinvalid);
    }

    const referenceYear = referenceDate.getUTCFullYear();
    const years = options.year !== undefined
        ? [options.year]
        : [referenceYear - 1, referenceYear, referenceYear + 1];
    const startTimes = years
        .filter((year) => julianDay >= 1 && julianDay <= (isLeapYear(year) ? 366 : 365))
        .map((year) => new Date(Date.UTC(year, 0, julianDay, hour, minute)));

    if (startTimes.length === 0) throw new Error(messages.datetimeinvalid);

    const startTime = startTimes.sort((a, b) =>
        Math.abs(a.getTime() - referenceDate.getTime()) - Math.abs(b.getTime() - referenceDate.getTime())
    )[0];

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

    const sender = parts[senderIndex + 1] ?? '';
    if (!/^[A-Z0-9/ ]{1,8}$/.test(sender)) throw new Error(messages.senderinvalid);
    if (parts.length !== senderIndex + 2) throw new Error(messages.invalidsameheader);

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
        const options = { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'UTC' };
        const time = date.toLocaleTimeString('en-US', options);
        const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
        const day = date.getUTCDate();
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
        formatted: `${org}a${new RegExp('^[aeiouAEIOU]').test(event) ? 'n' : ''} ${event} for ${locations.join('; ')}; beginning at ${formatTime(startTime)} and ending at ${formatTime(endTime)}. Message from ${sender}`
    };
};

module.exports = decodeSame;
