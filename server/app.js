const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')
const index = fs.readFileSync(path.resolve('public/index.html'));
const HOMEDIR = require('os').homedir()
const helmet = require('helmet')

const server = require('http').Server(app)
const io = require('socket.io')(server);

const argv = require('minimist')(process.argv.slice(2));

const port = process.env.PORT || 8000;
server.listen(port)


io.on('connection', function(socket) {
  console.log('Connected with client id : ', socket.id)
  socket.emit('welcome', { message: 'Welcome!', id: socket.id });

  socket.on('i am client', console.log);
});

// Not in use
function _parseData(log) {
  /*
     Types of events
     1. Join    -> $MyINFO
     2. Quit    -> $Quit
     3. Search  -> $Search
  */

  // We don't need to process logs with these keywords
  let noisy = false
  let noise = ['#[VIPChat]', '#[ModzChat]', '*message*']
  noise.forEach((item) => {
    if (log.indexOf(item) > -1) {
      noisy = true
    }
  })
  // Only *debug* messages are for activities
  if (log.indexOf('*debug*') < 0)
    noisy = true

  if (noisy)
    return {success: false}

  let logArray = log.split(' ')
  let lenLog = logArray.length
  let time = logArray && logArray[1]

  if (log.indexOf('$MyINFO') > -1) {
    let user = logArray[lenLog - 2]
    let returnData = {success: true, data: {type: 'JOIN', user, time}}
    return returnData
  } else if (log.indexOf('$Quit') > -1) {
    let user = logArray[lenLog - 1].slice(0, -1)
    let returnData = {success: true, data: {type: 'QUIT', user, time}}
    return returnData
  } else if (log.indexOf('$Search') > -1) {
    if (log.indexOf('TTH:') > -1) {
      let query = ''
      let returnData = {success: true, data: {type: 'SEARCH', query, time}}
      return returnData
    } else {
      let queryArray = logArray[lenLog - 1].split('?')
      let query = queryArray[queryArray.length - 1]
      query = query.split('$').join(' ')
      query = query.slice(0, -1)
      let returnData = {success: true, data: {type: 'SEARCH', query, time}}
      return returnData
    }
  } else if (log.indexOf('$SR') > -1) {
    let user = logArray[6]
    let returnData = {success: true, data: {type: 'SHARE', user, time}}
    return returnData
  } else {
    return {success: false}
  }

}

// app.use(helmet())
// app.disable('x-powered-by');

app.use('/static', express.static('public'))

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Must send "content-type": "application/json" in headers
app.use(bodyParser.json())

app.get('/', function(req, res) {
  res.sendFile(path.resolve('public/index.html'))
})

app.post('/data', function(req, res) {
  if (req.headers.authorization === 'MY-SECRET-KEY') {
    console.log(req.body.data)
    io.emit('log', { log: req.body.data });
    res.sendStatus(200)
  } else
    res.sendStatus(401)
})
