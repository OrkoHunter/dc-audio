const http = require('http');
const fs = require('fs');
const index = fs.readFileSync(__dirname + '/index.html');
const Tail = require('tail').Tail;
const HOMEDIR = require('os').homedir()

const io = require('socket.io').listen(app);

tail = new Tail("/home/hunter/.ncdc/stderr.log")

io.on('connection', function(socket) {
  console.log('Connected with client id : ', socket.id)
  socket.emit('welcome', { message: 'Welcome!', id: socket.id });

  socket.on('i am client', console.log);
});


tail.on('line', function(log) {
  let parsed = _parseData(log);
  console.log(parsed)
  if (parsed.success)
    io.emit('log', { log: parsed.data });
})

tail.on("error", function(error) {
  console.log('ERROR: ', error);
});


function _parseData(log) {
  /*
     Types of events
     1. Join    -> $MyINFO
     2. Quit    -> $Quit
     3. Search  -> $Search
  */

  // We don't need to process logs with these keywords
  let noisy = false
  let noise = ['#[VIPChat]', '#[ModzChat]', 'TTH:', '*message*']
  noise.forEach((item) => {
    if (log.indexOf(item) > -1)
      noisy = true
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
    let queryArray = logArray[lenLog - 1].split('?')
    let query = queryArray[queryArray.length - 1]
    query = query.split('$').join(' ')
    query = query.slice(0, -1)
    let returnData = {success: true, data: {type: 'SEARCH', query, time}}
    return returnData
  } else if (log.indexOf('$SR') > -1) {
    let user = logArray[6]
    let returnData = {success: true, data: {type: 'SHARE', user, time}}
    return returnData
  } else {
    return {success: false}
  }

}

var app = http.createServer(function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(index);
});

app.listen(3000);
