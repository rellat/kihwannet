
/**
 * Request Animation Frame Setting for compatibility.
 */
window.requestAnimFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function (callback) {
      window.setTimeout(callback, 1000 / 60)
    }
})()
window.cancelAnimFrame = (function () {
  return window.cancelAnimationFrame || window.mozCancelAnimationFrame
})()

/**
 * Manager for Request Animation Frame.
 * Less RAF call, better performance.
 * Ref: https://stackoverflow.com/questions/17103785/multiple-requestanimationframe-performance
 */
function LoopProcess () {
  var self = this
  self.processes = []

  function animate (timestamp) {
    for (var i = 0; i < self.processes.length; i++) {
      self.processes[i]() // execute each process.
    }
    window.requestAnimFrame(animate)
  }
  window.requestAnimFrame(animate)
}
LoopProcess.prototype.addProcess = function (process) {
  var self = this
  if (typeof process === 'function') {
    if (self.processes.findIndex(function (val) { return val === process }) === -1) self.processes.push(process)
    return process
  } else console.warn('LoopProcess: Attempt to non-function var to process array!')
  return null
}
LoopProcess.prototype.removeProcess = function (process) {
  var self = this
  var pidx = self.processes.findIndex(function (targetprocess) {
    return targetprocess === process
  })
  if (pidx !== -1) {
    self.processes.splice(pidx, 1)
    return true
  }
  return false
}

function getParameterByName (name) {
  var url = window.location.href
  name = name.replace(/[\[\]]/g, '\\$&')
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
  var results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

module.exports = {
  loopProcess: new LoopProcess(),
  getParameterByName: getParameterByName
}
