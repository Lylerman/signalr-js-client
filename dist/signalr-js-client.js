const signalR = new function() {
  let hubName = null
  this.url = null
  this.transport = 'webSockets'
  this.timeout = 3000

  const client = {}
  let token = null
  let connectionData = null
  let socket = null
  let evtSource = null

  let idleTime = null

  let resetIdleTimer = () => {
    clearTimeout(idleTime)
    idleTime = setTimeout(ping, 60000 * 5) // 5 minutes
  }

  this.connection = (hub) => {
    if (hub) {
      hubName = hub
      connectionData = encodeURIComponent('[{"name":"' + hubName +'"}]')      
    }

    return this
  }

  this.start = config => {
    stop()
    for (let key in config) {
      if (config.hasOwnProperty(key)) {
        this[key] = config[key]
      }
    }
    negotiate()
  }

  this.on = (name, fn) => {
    client[name] = fn
  }

  this.invoke = (name, ...args) => {
    resetIdleTimer()
    let request = {
      H: hubName,
      M: name,
      A: args,
      I: 0
    }

    switch (this.transport) {
      case 'webSockets': {
        socket.send(JSON.stringify(request))
        break
      }
      case 'serverSentEvents': {
        let reqBody = 'data=' + JSON.stringify(request)
        send(reqBody)
        break
      }
      case 'longPolling': {
        let reqBody = 'data=' + JSON.stringify(request)
        send(reqBody)
        break
      }
    }
  }

  const invokeClient = obj => {
    try {
      resetIdleTimer()
      let res = JSON.parse(obj)
      if (res.M) {
        if (res.M[0]) {
          let resp = res.M[0]
          if (client[resp.M])
            client[resp.M].apply(this, resp.A)
        }
      }
    } catch (err) {
      // do nothing
      console.log(err)
    }
  }

  const getWsUrl = url => {
    return 'ws://' + url.replace(/https?:\/\//i, '')
  }

  const xmlHttpReq = obj => {
    let xhttp = new XMLHttpRequest()
    let xhr = null

    xhttp.open(obj.method ? obj.method : 'GET', obj.url, true)

    if (obj.data) {
      xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
    }

    xhttp.onreadystatechange = function (e) {
      if (this.readyState === 4 && this.status === 200)  {
        xhr = JSON.parse(e.currentTarget.responseText)
        if (typeof obj.callback === 'function') {
          obj.callback(xhr)
        }
      }
    }
    
    if (obj.timeout) {
      xhttp.timeout = obj.timeout
      xhttp.ontimeout = obj.onTimeout ? obj.onTimeout : null
    }

    xhttp.send(obj.data ? obj.data : null)
  }

  const negotiate = () => {
    if (this.url && hubName) {
      let reqUrl = this.url + '/negotiate?clientProtocol=1.5&connectionData=%5B%7B%22name%22%3A%22' + hubName +'%22%7D%5D';
      xmlHttpReq({
        url: reqUrl,
        callback: data => {
          token = encodeURIComponent(data.ConnectionToken)          
          this.transport = !data.TryWebSockets && this.transport === 'webSockets' ? 'serverSentEvents' : this.transport

          connect()
        },
        timeout: this.timeout,
        onTimeout: () => {
          console.log('Cannot connect to SignalR server.')
        }
      })
    } else {
      console.log('Error in initializing SignalR: Please set url and hub name!')
    }
  }

  const connect = () => {
    switch (this.transport) {
      case 'webSockets': {
        let wsUrl = getWsUrl(this.url)
        socket = new WebSocket(wsUrl + '/connect?transport=webSockets&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData='+ connectionData)
        socket.onerror = (e) => {
          socket.close()
          socket = null

          this.transport = 'serverSentEvents'
          connect()
        }
        socket.onopen = (e) => {
          start()
        }
        socket.onmessage = (e) => {
          invokeClient(e.data)
        }
        break
      }
      case 'serverSentEvents': {
        let reqUrl = this.url + '/connect?transport=serverSentEvents&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData=' + connectionData
        evtSource = new EventSource(reqUrl)

        setTimeout(() => {
          if (evtSource.readyState !== EventSource.OPEN) {
            evtSource.close()
            evtSource = null
            
            this.transport = 'longPolling'
            connect()
          }
        }, 3000)

        evtSource.onopen = (e) => {
          start()
        }
        evtSource.onmessage = (e) => {
          invokeClient(e.data)
        }
        evtSource.onerror = (e) => {
          if (e.readyState === EventSource.CLOSED) {
            this.transport = 'longPolling'
            console.log('Long polling activated.')
          }
        }
        break
      }
      case 'longPolling': {
        let reqUrl = this.url + '/connect?transport=longPolling&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData=' + connectionData
        xmlHttpReq({
          url: reqUrl,
          callback: start
        })
        break
      }
    }
  }

  const start = () => {
    let reqUrl = this.url + '/start?transport=' + this.transport + '&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData=' + connectionData
    let callback = this.transport === 'longPolling' ? () => {
      poll()
      resetIdleTimer()
    } : resetIdleTimer
    xmlHttpReq({
      url: reqUrl,
      method: 'POST',
      callback: callback
    })
  }

  const poll = () => {
    let reqUrl = this.url + '/poll?transport=' + this.transport + '&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData=' + connectionData
    xmlHttpReq({
      url: reqUrl,
      method: 'POST',
      callback: res => {
        invokeClient(JSON.stringify(res))
        poll()
      }
    })
  }

  const ping = () => {
    let reqUrl = this.url + '/ping?transport=' + this.transport + '&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData=' + connectionData
    xmlHttpReq({
      url: reqUrl,
      method: 'POST',
      callback: resetIdleTimer
    })
  }

  const send = data => {
    let reqUrl = this.url + '/send?transport=' + this.transport + '&clientProtocol=1.5' + '&connectionToken=' + token + '&connectionData=' + connectionData
    xmlHttpReq({
      url: reqUrl,
      method: 'POST',
      data: data
    })
  }

  const abort = () => {
    let connectionData = encodeURIComponent('[]')
    let reqUrl = this.url + '/abort?transport=' + this.transport + '&clientProtocol=1.5' + '&token=&connectionToken=' + token + '&connectionData=' + connectionData
    xmlHttpReq({
      url: reqUrl,
      method: 'POST'
    })
  }

  const stop = () => {
    if (socket)
      socket.close()
    if (evtSource)
      evtSource.close()
    if (token)
      abort()
  }
}