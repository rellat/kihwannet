function LogicWork (options) { // width, height, container
  var self = this
  self.turn = 0
  self.dataArray = [1]
  self.actArray = [0]
  self.score = 0
}

LogicWork.prototype.gameLoop = function (delta) {
  var self = this
  for (var i = 0; i < self.actArray.length; i++) {
    // var element = self.actArray[i]
  }
}

LogicWork.prototype.getEnvironmentData = function () {
  var self = this
  return self.dataArray
}
LogicWork.prototype.pushAction = function (actions) {
  var self = this
  self.actArray = actions
  self.turn = (self.turn + 1) % 4
}

LogicWork.prototype.getScore = function (actions) {
  var self = this
  return self.score
}

LogicWork.prototype.reset = function (actions) {
  var self = this
  self.turn = 0
  self.dataArray = [1]
  self.actArray = [0]
  self.score = 0
}

module.exports = LogicWork
