var TetrisGame = require('./gamelogic.js')

function LogicWork (options) { // width, height, container
  var self = this
  self.turn = 0
  self.miliSecForTurn = 1000 // 1 second
  self.prevTick = 0
  self.tickForTurn = 0
  self.gameLogic = new TetrisGame({})
  self.board = self.gameLogic.getBoard()
}

LogicWork.prototype.gameLoop = function (delta) {
  var self = this
  // draw
  self.turn = (self.turn + 1) % 12 // frame skip
  if (self.turn === 0) {
    if (!self.gameLogic.go()) {
      self.gameLogic.reset()
    }
  }
  // draw board
  self.board = self.gameLogic.getBoard()
}

LogicWork.prototype.getEnvironmentData = function () {
  var self = this
  // serialize and desaturate
  var serialdata = []
  for (var i = 0; i < self.board.length; i++) {
    for (var j = 0; j < self.board[i].length; j++) {
      serialdata.push((self.board[i][j] === 0) ? 0 : 1)
    }
  }
  return serialdata
}

LogicWork.prototype.pushAction = function (actions) {
  var self = this
  // left, right, down, rotate, none
  if (actions[0]) self.gameLogic.doAction('left')
  if (actions[1]) self.gameLogic.doAction('right')
  if (actions[2]) self.gameLogic.doAction('rotate')
  if (actions[3]) self.gameLogic.doAction('down')
}

LogicWork.prototype.getScore = function (actions) {
  var self = this
  return self.gameLogic.getScore()
}

LogicWork.prototype.reset = function (actions) {
  var self = this
  self.gameLogic.reset()
  self.gameLogic.score = 0
}

module.exports = LogicWork
