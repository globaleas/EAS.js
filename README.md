# ![easJSlogo](https://assets.gwes-cdn.net/easjs%20square.png)
An open source EAS library created by the community, for the community

[![SAME](https://img.shields.io/badge/SAME-Specific%20Area%20Message%20Encoding-red)](https://en.wikipedia.org/wiki/Specific_Area_Message_Encoding) [![EAS](https://img.shields.io/badge/EAS-Emergency%20Alert%20System-green)](https://en.wikipedia.org/wiki/Specific_Area_Message_Encoding)

### This project is currently in development.
## Installation

You can install the entire EASjs library by running:

```bash
  cd my-project
  npm install easjs
```

Or you can install a specific module from EASjs by running:

```bash
  cd my-project
  npm install @easjs/samedecoder
```
## Usage/Examples

To decode a SAME header using EASjs:
```javascript
const samedecoder = require('easjs');

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
  timing: { start: '5:32 PM', end: '6:32 PM' },
  sender: 'ERN/LB',
  formatted: 'The Civil Authorities have issued a Administrative Message for Sedgwick, KS; beginning at 5:32 PM and ending at 6:32 PM. Message from ERN/LB'
}
```

#

To grab a specific value from the decoded data:
```javascript
const samedecoder = require('easjs');

const header = "ZCZC-CIV-ADR-020173+0100-3441707-ERN/LB-";
const decoder = samedecoder(header);
console.log(decoder.event);
```
Output:
```javascript
"Administrative Message"
```
## Support

For support or queries, open a issue here on GitHub or email harv@globaleas.org
