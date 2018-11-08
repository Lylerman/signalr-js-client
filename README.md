# SignalR JS Client

A SignalR Javascript client **without** dependencies. Supports the following transport methods:

  - Web sockets
  - Server-sent Events (SSE)
  - Long polling

### Installation

```sh
$ cd my-app
$ npm install signalr-js-client
```
or
```html
<script src="https://cdn.jsdelivr.net/gh/lylerman/signalr-js-client/dist/signalr-js-client.js"></script> // minified version also available
```
### Usage

##### Initialize

```js
import signalR from 'signalr-js-client';   // for npm installs only

const hub = signalR.connection('hubName');
hub.url = 'http://website.com/signalr';   // can be included in options
    
hub.start();   // hub.start([options])
```

##### Client-methods

```js
hub.on('notify', msg => {
    console.log(msg);
});
```

##### Server-methods

```js
hub.invoke('BroadcastNotification', [...params])
```

### Options

You can set these options on or before calling ```hub.start()```.

| Option | Values |Description | Default |
| ------ | ------ | ------ | ------ |
| ```timeout``` | any positive integer | sets timeout *(in milliseconds)* for negotiationg with server | 3000 |
| ```transport``` | *webSockets, sentEvents, longPolling* | specifies transport type *(falls back automatically)* | webSockets |
| ```url``` (required) | signalr server url | sets url where signalR will connect to | N/A |