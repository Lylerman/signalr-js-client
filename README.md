# SignalR JS Client

A SignalR Javascript client **without** dependencies. Supports the following transport methods:

  - Web sockets
  - Server-sent Events (SSE)
  - Long polling

## Installation

```sh
$ cd my-app
$ npm install signalr-js-client
```
or
```html
<script src='https://cdn.jsdelivr.net/gh/lylerman/signalr-js-client/dist/signalr-js-client.min.js'></script>
```
## Usage

### Initialize

For the referenced script version, make sure to use the ```signalR``` keyword when initializing the connection. Please ***do not*** use ```import``` when referencing via script tag.
```js
import signalR from 'signalr-js-client';

const hub = signalR.connection('hubName');
hub.url = 'http://website.com/signalr';
    
hub.start();
```

### Client-methods

```js
hub.on('notify', msg => {
    console.log(msg);
});
```

### Server-methods
When applicable, separate params using commas.
```js
hub.invoke('BroadcastNotification', msg)
```

## Options

You can set these options on or before calling ```hub.start()```. Transport fallback is in this order: web sockets, server-sent events, long polling.

| Option | Values |Description | Default |
| ------ | ------ | ------ | ------ |
| ```timeout``` | any positive integer | sets timeout *(in milliseconds)* for negotiationg with server | 3000 |
| ```transport``` | *webSockets, serverSentEvents, longPolling* | specifies transport type *(falls back automatically)* | webSockets |
| ```url``` (required) | signalr server url | sets url where signalR will connect to | N/A |

#### Example
```js
hub.start({
    url: 'http://website.com/signalR',
    transport: 'serverSentEvents',
    timeout: 5000
});
```
or
```js
hub.url = 'http://website.com/signalR';
hub.start();
```
> The ```timeout``` option is used only for the *negotiate* request.


## Todo
 - Forever frame for IE