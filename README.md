# ![easJSlogo](https://assets.gwes-cdn.net/easjs%20mock%20Medium.png)
An open source EAS library created by the community, for the community

[![SAME](https://img.shields.io/badge/SAME-Specific%20Area%20Message%20Encoding-red)](https://en.wikipedia.org/wiki/Specific_Area_Message_Encoding) [![EAS](https://img.shields.io/badge/EAS-Emergency%20Alert%20System-green)](https://en.wikipedia.org/wiki/Emergency_Alert_System)

## Installation
You can install the entire EASjs library by running:
```bash
  cd my-project
  npm install @globaleas/easjs
```
## Usage/Examples


### To generate an EAS alert using EASjs:
```javascript
const { generateEASAlert } = require('@globaleas/easjs');

const header = 'ZCZC-CIV-ADR-020173+0100-3441707-ERN/LB-';
generateEASAlert(header)
```
Without any changes to the configuration, it will output the generated SAME alert in the current working directory as `output.wav`

### To generate an EAS alert with a custom configuration:
```javascript
const { generateEASAlert, MODES } = require('@globaleas/easjs'); // Import the MODES object for configuration

const header = 'ZCZC-CIV-ADR-020173+0100-3441707-ERN/LB-';
generateEASAlert(header, {
    audioPath: 'alert-audio.mp3',
    outputFile: 'final-alert.wav',
    format: 'wav',
    mode: MODES.DIGITAL
})
```

### To decode a SAME header using EASjs:
```javascript
const { decodeSame } = require('@globaleas/easjs')

const result = decodeSame('ZCZC-WXR-TSW-006081-006013-006001-006087-006085+0100-3401900-WJON/BLU-')
console.log(result)
```

#### Output:

```javascript
{
  organization: 'The National Weather Service has issued ',
  event: 'Tsunami Warning',
  locations: 'San Mateo, CA; Contra Costa, CA; Alameda, CA; Santa Cruz, CA; Santa Clara, CA',
  timing: { start: '7:00 PM on December 6', end: '8:00 PM on December 6' },
  sender: 'WJON/BLU',
  formatted: 'The National Weather Service has issued a Tsunami Warning for San Mateo, CA; Contra Costa, CA; Alameda, CA; Santa Cruz, CA; Santa Clara, CA; beginning at 7:00 PM on December 6 and ending at 8:00 PM on December 6. Message from WJON/BLU'
}
```
To grab a specific value from the decoded data:
```javascript
const { decodeSame } = require('@globaleas/easjs')

### To grab a specific value from the decoded data:

const result = decodeSame('ZCZC-WXR-TSW-006081-006013-006001-006087-006085+0100-3401900-WJON/BLU-')
console.log(result.organization)
```
Output:
```
The National Weather Service has issued
```
### To only translate an event code:
```javascript
const { eventTranslator } = require('@globaleas/easjs')

const result = eventTranslator('TSW')
console.log(result)
```
Output:
```
Tsunami Warning
```
### To translate a FIPS code:

```javascript
const { translateFips } = require('@globaleas/easjs')

const result = translateFips('006081')
console.log(result)
```
#### Output:
```javascript
{
  subdivision: 'All',
  county: 'San Mateo',
  region: 'CA',
  formatted: 'All San Mateo, CA'
}
```
### To translate an originator:
```javascript
const { origTranslator } = require('@globaleas/easjs')

const result = origTranslator('PEP')
console.log(result)
```
Output:
```
United States Government
```
## Support

For support or queries, open a issue here on GitHub or email developers@globaleas.org
