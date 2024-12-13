# ![easJSlogo](https://assets.gwes-cdn.net/easjs%20mock%20Medium.png)
An open source EAS library created by the community, for the community

[![SAME](https://img.shields.io/badge/SAME-Specific%20Area%20Message%20Encoding-red)](https://en.wikipedia.org/wiki/Specific_Area_Message_Encoding) [![EAS](https://img.shields.io/badge/EAS-Emergency%20Alert%20System-green)](https://en.wikipedia.org/wiki/Emergency_Alert_System)

### This project is currently in development.
## Installation

You can install the entire EASjs library by running:

```bash
  cd my-project
  npm install @globaleas/easjs
```

## Usage/Examples

To decode a SAME header using EASjs:
```javascript
const samedecoder = require('@globaleas/easjs');

const header = "ZCZC-CIV-ADR-020173+0100-3441707-ERN/LB-";
const decoder = samedecoder(header);
console.log(decoder);
```

Output:
```javascript
{
  organization: 'The Civil Authorities have issued ',
  event: 'Administrative Message',
  locations: 'Sedgwick, KS',
  timing: { start: '10:07 AM on December 9', end: '11:07 AM on December 9' },
  sender: 'ERN/LB',
  formatted: 'The Civil Authorities have issued a Administrative Message for Sedgwick, KS; beginning at 10:07 AM on December 9 and ending at 11:07 AM on December 9. Message from ERN/LB'
}
```

#

To grab a specific value from the decoded data:
```javascript
const samedecoder = require('@globaleas/easjs');

const header = "ZCZC-CIV-ADR-020173+0100-3441707-ERN/LB-";
const decoder = samedecoder(header);
console.log(decoder.event);
```
Output:
```javascript
"Administrative Message"
```
## Support

For support or queries, open a issue here on GitHub or email developers@globaleas.org
