# @cumulus/json-logger

A library that outputs JSON-formatted log events

This is a simple class for writing JSON-formatted log events to the console. At the bare
minimum, all events will contain `level`, `message`, and `timestamp` properties.

Additional log event fields can be set on the `Logger` instance when it is initialized,
or by calling the `.setDefaultAttribute()` method. These fields will then be part of all log events.

Per-event fields can also be set when writing an individual event.

⚠️ The [documented API](#api) of this package will not change without a
deprecation warning being provided in earlier releases. Code in this package
that is _not_ documented in this README may change without warning, and is not
considered part of the package's public API.

## Installation

```sh
$ npm install @cumulus/json-logger
```

## Usage

```js
const { Logger } = require('json-logger');

const logger = new Logger({
  defaultFields: {
    stage: 'production'
  }
});

logger.info('Good news');
// => { "level": "info", "timestamp": 1588092969420, "stage": "production", "message": "Good news" }


const prettyLogger = new Logger({ pretty: true });

prettyLogger.error('oops');
// => {
//   "level": "error",
//   "timestamp": 1588092969420,
//   "message": "oops"
// };

prettyLogger.exception(new Error('oh no'), 'so bad');
// => {
//   "level": "error",
//   "timestamp": 1588092969420,
//   "message": "so bad",
//   "error": {
//     "message": "oh no",
//     "name": "Error"
//   }
// }
```

## API

<a name="Logger"></a>

## Logger
A class to write logs in JSON-formatted log events

**Kind**: global class  

* [Logger](#Logger)
    * [new Logger([params])](#new_Logger_new)
    * [.setDefaultAttribute(name, value)](#Logger+setDefaultAttribute)
    * [.info(message, [additionalFields])](#Logger+info)
    * [.error(message, [additionalFields])](#Logger+error)
    * [.exception(error, [message], [additionalFields])](#Logger+exception)

<a name="new_Logger_new"></a>

### new Logger([params])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [params] | <code>Object</code> |  |  |
| [params.defaultFields] | <code>Object</code> |  | default attributes to be set on all log events |
| [params.console] | <code>Console</code> | <code>global.console</code> | the console to use for output |
| [params.pretty] | <code>boolean</code> | <code>false</code> | pretty-print JSON |

<a name="Logger+setDefaultAttribute"></a>

### logger.setDefaultAttribute(name, value)
Set an attribute on all log events

**Kind**: instance method of [<code>Logger</code>](#Logger)  

| Param | Type |
| --- | --- |
| name | <code>string</code> | 
| value | <code>any</code> | 

<a name="Logger+info"></a>

### logger.info(message, [additionalFields])
Write out a log event with level=info

**Kind**: instance method of [<code>Logger</code>](#Logger)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> |  |
| [additionalFields] | <code>Object</code> | attributes to log in addition to the defaults |

<a name="Logger+error"></a>

### logger.error(message, [additionalFields])
Write out a log event with level=error

**Kind**: instance method of [<code>Logger</code>](#Logger)  

| Param | Type | Description |
| --- | --- | --- |
| message | <code>string</code> |  |
| [additionalFields] | <code>Object</code> | attributes to log in addition to the defaults |

<a name="Logger+exception"></a>

### logger.exception(error, [message], [additionalFields])
Log an exception with level=info

**Kind**: instance method of [<code>Logger</code>](#Logger)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| error | <code>Error</code> |  | an exception to be logged |
| [message] | <code>string</code> | <code>&quot;error.message&quot;</code> | the message, defaults to the value of `error.message` |
| [additionalFields] | <code>Object</code> |  | attributes to log in addition to the defaults |


## About Cumulus

Cumulus is a cloud-based data ingest, archive, distribution and management
prototype for NASA's future Earth science data streams.

[Cumulus Documentation](https://nasa.github.io/cumulus)

## Contributing

To make a contribution, please [see our contributing guidelines](https://github.com/nasa/cumulus/blob/master/CONTRIBUTING.md).

---
Generated automatically using `npm run build-docs`
