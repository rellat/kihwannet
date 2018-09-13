var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var WebWorkify = require('webworkify')

inherits(Evolve, EventEmitter)
function Evolve (options) {
  var self = this
  self.worker = undefined
}

Evolve.prototype.distribute = function (data) {
  var self = this
  self.worker = new WebWorkify(require('./evolve.worker'))
  self.worker.addEventListener('message', function (ev) {
    // console.log(JSON.stringify(ev.data))
    console.log('worker result score: ' + ev.data.data[0].score)
    self.emit('result', ev.data.data[0].network)
  })

  // data: { networkdata, inputGame, size }
  self.worker.postMessage({
    type: 'init',
    data: data
  }) // send the worker a message
  console.log('worker started at ' + self.worker.objectURL)
}

module.exports = Evolve
