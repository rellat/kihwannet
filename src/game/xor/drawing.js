/* global PIXI */

function Scene (options) { // width, height, container
  var self = this
  self.turn = 0
  self.miliSecForTurn = 1000 // 1 second
  self.dataArray = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]
  self.actArray = [0, 0, 0, 0]

  // PIXI renderer setting
  self.renderer = PIXI.autoDetectRenderer(170, 230,
    { antialias: !0, transparent: !0, resolution: 1 })
  self.container = options.container || document.body
  self.container.style.width = '170px'
  self.container.style.height = '230px'
  self.container.appendChild(self.renderer.view)

  self.stage = new PIXI.Container()
  self.boardClip = new PIXI.Graphics()
  for (var i = 0; i < self.dataArray.length; i++) {
    var element = self.dataArray[i]
    self.boardClip.lineStyle(0, 0xFFFFFF)
    self.boardClip.beginFill(element[0] === 1 ? 0xFF700B : 0x444444, 1)
    self.boardClip.drawRect(0, i * 55, 50, 50)
    self.boardClip.endFill()
    self.boardClip.beginFill(element[1] === 1 ? 0xFF700B : 0x444444, 1)
    self.boardClip.drawRect(55, i * 55, 50, 50)
    self.boardClip.endFill()
  }
  self.ansClip = new PIXI.Graphics()
  self.ansClip.x = 110
  self.stage.addChild(self.boardClip)
  self.stage.addChild(self.ansClip)
}

Scene.prototype.gameLoop = function (delta) {
  var self = this
  // draw
  self.ansClip.clear()
  for (var i = 0; i < self.actArray.length; i++) {
    var element = self.actArray[i]
    self.ansClip.lineStyle(0, 0xFFFFFF)
    self.ansClip.beginFill(element >= 1 ? 0x70FF0B : 0x444444, 1)
    self.ansClip.drawRect(0, i * 55, 50, 50)
    self.ansClip.endFill()
  }
  self.renderer.render(self.stage)
}

Scene.prototype.getScene = function () {
  var self = this
  return self.stage
}
Scene.prototype.getEnvironmentData = function () {
  var self = this
  return self.dataArray[self.turn]
}
Scene.prototype.pushAction = function (actions) {
  var self = this
  self.actArray[self.turn] = actions[0]
  self.turn = (self.turn + 1) % 4
}

module.exports = Scene
