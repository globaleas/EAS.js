# Changelog

All notable changes to EASjs are documented in this file.

## 0.3.0 - 2026-09-04

### Added

- Added optional `referenceDate`, `year`, and `timeZone` options to `decodeSame`.
- Added a workflow for mirroring the repository to Bitbucket.

### Changed

- Deprecated the ignored `format` generator option. It remains accepted for backwards compatibility; use the `outputFile` extension instead.

### Breaking Changes

- `decodeSame` and `generateEASAlert` now reject malformed headers that were previously accepted, including invalid time values, invalid duration increments, malformed locations, more than 31 locations, invalid senders, and extra fields.
- `generateEASAlert` now requires a valid SAME header instead of accepting arbitrary message strings such as `ZCZC-TEST`.
- `generateEASAlert` now rejects when audio or MP3 conversion fails instead of logging the error and resolving it.
- `generateEASAlert` now rejects unsupported generator modes instead of using the default behavior.
- EASjs now requires Node.js 16 or newer.

### Fixed

- Use unique OS temporary directories for audio conversion and MP3 export.
- Normalize missing final header dashes before decoding and generation.
- Accept shorter sender IDs and pad them to eight characters during generation.
- Accept validity periods through 99 hours and 30 minutes, following NWS SAME guidelines.
- Fixed some misspellings in the `EASData.json` file.
- Limit the published package to runtime files and documentation.

## 0.2.4 - 2025-09-28

### Changed

- Format decoded alerts with the correct indefinite article for event names beginning with a vowel.
- Clarified the Immediate Evacuation Notice and Nuclear Power Plant Warning event names.

## 0.2.3 - 2025-07-24

### Fixed

- Corrected the post-header silence timing for Trilithic mode without affecting other generator modes.

## 0.2.2 - 2025-04-24

### Changed

- Refined generated header audio and mode-specific silence durations.

## 0.2.1 - 2025-04-14

### Changed

- Modernized translator, decoder, and generator implementations.
- Improved validation error selection for originator and FIPS codes.

## 0.2.0 - 2025-01-28

### Added

- Added EAS audio generation with configurable modes, attention tones, message audio, and output files.
- Added Default, NWS, Digital, Sage, and Trilithic generator modes.
- Added WAV output and FFmpeg-backed audio conversion.

## 0.1.1 - 2025-01-12

### Fixed

- Corrected statewide FIPS translation and formatting.
- Corrected originator translation to use the intended originator labels.
- Updated tests and documentation for the corrected translator behavior.

## 0.1.0 - 2025-01-12

### Added

- Added FIPS location translation with subdivision support.
- Added event code translation.
- Added originator code translation.
- Added the main package entry point and exported translator functions.

### Fixed

- Corrected locale filename casing for case-sensitive systems.

## 0.0.3 - 2024-12-11

### Changed

- Updated package documentation and version metadata.

## 0.0.2 - 2024-12-11

### Changed

- Declared the package as CommonJS.

## 0.0.1 - 2024-12-11

### Added

- Published the initial EASjs package.
- Added SAME header decoding with Julian date and validity-period handling.
- Added Jest tests and npm publishing automation.
- Added initial project documentation, contribution templates, and licensing.
