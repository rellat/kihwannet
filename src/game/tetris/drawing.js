/* global PIXI */
var TetrisGame = require('./gamelogic.js')

function Scene (options) { // width, height, container
  var self = this
  self.turn = 0
  self.miliSecForTurn = 1000 // 1 second
  self.prevTick = 0
  self.tickForTurn = 0
  self.gameLogic = new TetrisGame({})
  self.board = self.gameLogic.getBoard()
  self.prevSize = { width: options.width || 800, height: options.height || 600 }

  // PIXI renderer setting
  self.renderer = PIXI.autoDetectRenderer(140, 140,
    { antialias: !0, transparent: !0, resolution: 1 })
  self.container = options.container || document.body
  self.container.style.width = '140px'
  self.container.style.height = '140px'
  self.container = options.container || document.body
  self.container.appendChild(self.renderer.view)

  self.stage = new PIXI.Container()
  self.stage.x = 10
  self.stage.y = 10
  self.boardClip = new PIXI.Graphics()
  self.stage.addChild(self.boardClip)
}

Scene.prototype.gameLoop = function (delta) {
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
  // console.log(JSON.stringify(self.board))
  self.boardClip.clear()
  for (var i = 0; i < self.board.length; i++) {
    for (var j = 0; j < self.board[i].length; j++) {
      var element = self.board[i][j]
      self.boardClip.lineStyle(0, 0xFFFFFF)
      self.boardClip.beginFill(element > 0 ? 0x70FF0B : 0x444444, 1)
      self.boardClip.drawRect(j * 25, i * 25, 20, 20)
      self.boardClip.endFill()
    }
  }
  self.renderer.render(self.stage)
}

// Scene.prototype.getScene = function () {
//   var self = this
//   return self.stage
// }
Scene.prototype.getEnvironmentData = function () {
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
Scene.prototype.pushAction = function (actions) {
  var self = this
  // left, right, down, rotate, none
  if (actions[0]) self.gameLogic.doAction('left')
  if (actions[1]) self.gameLogic.doAction('right')
  if (actions[2]) self.gameLogic.doAction('rotate')
  if (actions[3]) self.gameLogic.doAction('down')
}

module.exports = Scene
