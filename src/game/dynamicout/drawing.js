/* global PIXI */

function Scene (options) { // width, height, container
  var self = this
  self.turn = 0
  self.dataArray = [1]
  self.actArray = [0]
  self.prevSize = { width: options.width || 800, height: options.height || 600 }

  // PIXI renderer setting
  self.renderer = PIXI.autoDetectRenderer(options.width || 800, options.height || 600,
    { antialias: !0, transparent: !0, resolution: 1 })
  self.container = options.container || document.body
  self.container.appendChild(self.renderer.view)

  self.stage = new PIXI.Container()
  self.boardClip = new PIXI.Graphics()
  self.stage.addChild(self.boardClip)
}

Scene.prototype.gameLoop = function (delta) {
  var self = this
  // draw
  self.boardClip.clear()
  for (var i = 0; i < self.actArray.length; i++) {
    var element = self.actArray[i]
    self.boardClip.lineStyle(0, 0xFFFFFF)
    self.boardClip.beginFill(element >= 1 ? 0x70FF0B : 0x444444, 1)
    self.boardClip.drawRect(0, i * 55, 50, 50)
    self.boardClip.endFill()
  }
  self.renderer.render(self.stage)

  if (self.prevSize.width !== self.stage.width || self.prevSize.height !== self.stage.height) {
    self.renderer.resize(self.stage.width, self.stage.height)
    self.container.style.width = self.stage.width + 10 + 'px'
    self.container.style.height = self.stage.height + 10 + 'px'
    self.prevSize.width = self.stage.width
    self.prevSize.height = self.stage.height
    console.log('game resize: ' +
      self.prevSize.width + ' ' + self.stage.width + ' ' + self.prevSize.height + ' ' + self.stage.height)
  }
}

Scene.prototype.getScene = function () {
  var self = this
  return self.stage
}
Scene.prototype.getEnvironmentData = function () {
  var self = this
  return self.dataArray
}
Scene.prototype.pushAction = function (actions) {
  var self = this
  self.actArray = actions
  self.turn = (self.turn + 1) % 4
}

module.exports = Scene
