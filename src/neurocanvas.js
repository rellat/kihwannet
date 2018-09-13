/* global PIXI */

var util = require('./util')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var hslToHexColor = require('./hsl')

var CANVAS_STATE = {
  view: 'view',
  edit: 'edit',
  pause: 'pause'
}
var TO = '->'

inherits(NeuroCanvas, EventEmitter)
function NeuroCanvas (options) {
  var self = this
  self.stage = new PIXI.Container()
  self.renderer = PIXI.autoDetectRenderer(options.width || 800, options.height || 600,
      {antialias: !0, transparent: !0, resolution: 1})
  self.container = options.container || document.body
  self.neuralNetwork = options.neuralNetwork
  self.neuroPanel = options.neuroPanel
  console.log('NeuroCanvas created.')

  self.container.appendChild(self.renderer.view)
  if (options.data) {
    self.initCanvas(options.data)
  }
  window.addEventListener('resize', this.canvasResize.bind(this), false)
}
NeuroCanvas.prototype.canvasResize = function (event) {
  this.renderer.resize(this.container.clientWidth, this.container.clientHeight)
}
/**
 * Initialaze canvas
 */
NeuroCanvas.prototype.initCanvas = function () {
  var self = this
  self.canvasState = CANVAS_STATE.view
  self.holdedKey = -1 // hold only one key.
  self.selectedLink = null
  self.selectedNode = null
  self.draggingSprite = false
  self.draggingStage = false
  self.draggingStageDelta = 0
  self.pointerupTracker = false

  // var for Zoom and Pan
  self.main_layer_zoom_scale = 1
  self.main_layer_zoom_scalemax = 20
  self.main_layer_zoom_scalemin = 0.4
  self.main_layer_zoom_offset_x = 0
  self.main_layer_zoom_offset_y = 0

  self.linkClip = new PIXI.Graphics()
  self.stage.addChild(self.linkClip)
  self.neuralNetwork.neuronData.links.forEach(function (link, i) {
    link.sprite = self.createRoute(link.source, link.target, self.linkClip, link)
  })

  self.nodeClip = new PIXI.Graphics()
  self.stage.addChild(self.nodeClip)
  self.neuralNetwork.neuronData.nodes.forEach(function (node, i) {
    node.sprite = self.createNeuron(node.x, node.y, self.nodeClip, node)
  })

  self.tempArrow = new PIXI.Graphics()
  self.tempArrow.interactive = false
  self.tempArrow.buttonMode = false
  self.stage.addChild(self.tempArrow)
  self.draggingArrow = false

  // set main loop method
  util.loopProcess.addProcess(self.renderLoop.bind(self))

  document.body.addEventListener('keydown', self.keydown.bind(self))
  document.body.addEventListener('keyup', self.keydown.bind(self))

  // Attach cross browser mouse wheel listeners
  if (document.body.addEventListener) {
    self.container.addEventListener('mousewheel', self.onZoom.bind(self), false) // Chrome/Safari/Opera
    self.container.addEventListener('DOMMouseScroll', self.onZoom.bind(self), false) // Firefox
  } else if (document.body.attachEvent) {
    self.container.attachEvent('onmousewheel', self.onZoom.bind(self)) // IE
  }

  self.renderer.plugins.interaction
      .on('pointerdown', function (event) {
        if (!self.draggingSprite && !self.draggingArrow) {
          self.draggingStage = true
          self.draggingStageDelta = 0
          self.clientX = -1
          self.clientY = -1
        }
      })
      .on('pointerup', function (event) {
        if (self.draggingStage && self.draggingStageDelta < 5 && self.canvasState === CANVAS_STATE.edit) {
          // on click
          var pos = event.data.getLocalPosition(self.stage)
          var nodeData = {
            id: Math.random().toString(36).substr(2),
            x: pos.x,
            y: pos.y
          }
          self.neuralNetwork.addNode(nodeData, true)
          self.selectedNode = self.neuralNetwork.getNode(nodeData.id)
          self.selectedNode.sprite = self.createNeuron(self.selectedNode.x, self.selectedNode.y, self.nodeClip, self.selectedNode)
          self.emit('neuronSelected', self.selectedNode.id)
        }
        self.draggingStage = false
        self.tempArrow.clear()
        self.draggingArrow = false
        self.tempArrow.data = null

        if (self.pointerupTracker) { // ignore, if sprite event occur
          self.pointerupTracker = false
        } else {
          self.selectedNode = null
          self.selectedLink = null
        }
      })
      .on('pointermove', function (event) {
        // if (!self.draggingSprite || !self.selectedNode || !self.selectedLink)
        if (self.draggingStage && !self.draggingSprite && !self.draggingArrow) {
          self.draggingStageDelta += 1
          // If this is the first iteration through then set clientX and clientY to match the inital mouse position
          if (self.draggingStageDelta < 5) return
          var pos = event.data.global
          if (self.clientX === -1 && self.clientY === -1) {
            self.clientX = pos.x
            self.clientY = pos.y
          }

          var xPos
          var yPos
          // Run a relative check of the last two mouse positions to detect which direction to pan on x
          if (pos.x === self.clientX) {
            xPos = 0
          } else if (pos.x < self.clientX) {
            xPos = -Math.abs(pos.x - self.clientX)
          } else if (pos.x > self.clientX) {
            xPos = Math.abs(pos.x - self.clientX)
          }

          // Run a relative check of the last two mouse positions to detect which direction to pan on y
          if (pos.y === self.clientY) {
            yPos = 0
          } else if (pos.y < self.clientY) {
            yPos = -Math.abs(pos.y - self.clientY)
          } else if (pos.y > self.clientY) {
            yPos = Math.abs(self.clientY - pos.y)
          }

          // Set the relative positions for comparison in the next frame
          self.clientX = pos.x
          self.clientY = pos.y

          // Change the main layer zoom offset x and y for use when mouse wheel listeners are fired.
          self.main_layer_zoom_offset_x = self.stage.position.x + xPos
          self.main_layer_zoom_offset_y = self.stage.position.y + yPos

          // Move the main layer based on above calucalations
          self.stage.position.set(self.main_layer_zoom_offset_x, self.main_layer_zoom_offset_y)
        }
      })
}

NeuroCanvas.prototype.onZoom = function (event) {
  var self = this
  // Find the direction that was scrolled
  var direction = wheelDirection(event)

  // Set the old scale to be referenced later
  var oldScale = self.main_layer_zoom_scale

  // Find the position of the clients mouse
  var pos = { x: event.clientX, y: event.clientY }

  // Manipulate the scale based on direction
  self.main_layer_zoom_scale = oldScale + direction * 0.4

  // Check to see that the scale is not outside of the specified bounds
  if (self.main_layer_zoom_scale > self.main_layer_zoom_scalemax) self.main_layer_zoom_scale = self.main_layer_zoom_scalemax
  else if (self.main_layer_zoom_scale < self.main_layer_zoom_scalemin) self.main_layer_zoom_scale = self.main_layer_zoom_scalemin

  // This is the magic. I didn't write this, but it is what allows the zoom to work.
  self.main_layer_zoom_offset_x = (self.main_layer_zoom_offset_x - pos.x) * (self.main_layer_zoom_scale / oldScale) + pos.x
  self.main_layer_zoom_offset_y = (self.main_layer_zoom_offset_y - pos.y) * (self.main_layer_zoom_scale / oldScale) + pos.y

  // Set the position and scale of the DisplayObjectContainer
  self.stage.scale.set(self.main_layer_zoom_scale, self.main_layer_zoom_scale)
  self.stage.position.set(self.main_layer_zoom_offset_x, self.main_layer_zoom_offset_y)
}

/**
 * Main Loop for graphic drawing
 */
NeuroCanvas.prototype.renderLoop = function () {
  var self = this
  if (self.holdedKey === 17 && self.canvasState === CANVAS_STATE.view) {
    self.canvasState = CANVAS_STATE.edit
    self.container.style.cursor = 'cell'
    // document.body.style.background = '#eeeeee'
    console.log('state Change ' + self.canvasState)
  } else if (self.holdedKey !== 17 && self.canvasState === CANVAS_STATE.edit) {
    self.canvasState = CANVAS_STATE.view
    self.container.style.cursor = ''
    // document.body.style.background = '#ffffff'
    console.log('state Change ' + self.canvasState)
  }

  self.neuralNetwork.neuronData.nodes.forEach(function (node) {
    if (!node.sprite) {
      node.sprite = self.createNeuron(node.x, node.y, self.nodeClip, node)
    } else {
      node.sprite.clear()
      // node 객체에 저장된 좌표를 그래프 캔버스에 적용한다.
      node.sprite.position = new PIXI.Point(node.x, node.y)
      node.sprite.lineStyle(1.5, 0xFFFFFF)
      node.sprite.beginFill(neuronGroupColor(node.group), 0.9)
      node.sprite.drawCircle(0, 0, 15)
      node.sprite.endFill()
    }
    // node.actvalue가 변하면 화면에서 노드에 표시가 되게 만들기
    if (node.actvalue) {
      var actweight = Math.abs(node.actvalue) < 2 ? Math.abs(node.actvalue) : 2
      var actcolor = node.actvalue > 0 ? 0xDDAAAA : 0x4444AA
      node.sprite.lineStyle(0, 0xFFFFFF)
      node.sprite.beginFill(actcolor, 1)
      node.sprite.drawCircle(0, 0, actweight * 5)
      node.sprite.endFill()
    }
    if (self.selectedNode) {
      if (node === self.selectedNode) {
        node.sprite.alpha = 1
      } else {
        node.sprite.alpha = 0.4
      }
    } else {
      node.sprite.alpha = 1
    }
  })
  // 라인을 새로 그린다.
  self.neuralNetwork.neuronData.links.forEach(function (link) {
    if (!link.sprite) {
      link.sprite = self.createRoute(link.source, link.target, self.linkClip, link)
    } else {
      link.sprite.clear()
      var from = self.neuralNetwork.getNode(link.source)
      var to = self.neuralNetwork.getNode(link.target)
      if (!from || !to) return console.log('invalid link data')
      link.sprite.rotation = 0
      var dx = to.x - from.x
      var dy = to.y - from.y
      var dist = Math.sqrt(dx * dx + dy * dy)
      var angle = Math.atan2(dy, dx)
      drawArrow(link.sprite, dist, link.value)
      link.sprite.x = from.x
      link.sprite.y = from.y
      link.sprite.rotation = angle
      link.sprite.alpha = 0.6
    }
  })

  self.tempArrow.clear()
  if (self.selectedNode && self.tempArrow.data && self.draggingArrow) {
    var pos = self.tempArrow.data.getLocalPosition(self.stage)
    var dx = pos.x - self.selectedNode.x
    var dy = pos.y - self.selectedNode.y
    var dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 35) return

    var angle = Math.atan2(dy, dx)
    drawArrow(self.tempArrow, dist, 2, 0x444444)
    self.tempArrow.x = self.selectedNode.x
    self.tempArrow.y = self.selectedNode.y
    self.tempArrow.rotation = angle
  }

  self.renderer.render(self.stage)
}

/**
 * Create Neuron node
 */
NeuroCanvas.prototype.createNeuron = function (x, y, stage, neuron) {
  var self = this
  stage = stage || this.nodeClip
  // create our Neuron sprite
  var sprite = new PIXI.Graphics()
  sprite.lineStyle(1.5, 0xFFFFFF)
  sprite.beginFill(neuronGroupColor(neuron.group), 0.8)
  sprite.drawCircle(0, 0, 15)
  sprite.endFill()
  // enable the Neuron sprite to be interactive... this will allow it to respond to mouse and touch events
  sprite.interactive = true
  // this button mode will mean the hand cursor appears when you roll over the bunny with your mouse
  sprite.buttonMode = true
  // sprite.scale.set(3);
  sprite.neuronID = neuron.id
  sprite.prevGroup = neuron.group

  // the pointer events takes mouse + touch events
  sprite
      .on('pointerdown', function (event) {
        if (self.canvasState === CANVAS_STATE.view) {
          self.onViewModeNeuronDragStart(this, event)
        } else if (self.canvasState === CANVAS_STATE.edit) {
          self.onEditModeNeuronDragStart(this, event)
        }
      })
      .on('pointerup', function (event) {
        if (self.canvasState === CANVAS_STATE.view) {
          self.onViewModeNeuronDragEnd(this, event)
        } else if (self.canvasState === CANVAS_STATE.edit) {
          self.onEditModeNeuronDragEnd(this, event)
        }
      })
      .on('pointerupoutside', function (event) {
        if (self.canvasState === CANVAS_STATE.view) {
          self.onViewModeNeuronDragEnd(this, event)
        } else if (self.canvasState === CANVAS_STATE.edit) {
          self.onEditModeNeuronDragEnd(null, event)
        }
      })
      .on('pointermove', function (event) {
        if (self.canvasState === CANVAS_STATE.view) {
          self.onViewModeNeuronDragMove(this, event)
        }
      })
      // For mouse-only events, use mouse*
      // For touch-only events, use touch*

  // move the sprite to its designated position
  sprite.x = x
  sprite.y = y
  // add it to the stage
  stage.addChild(sprite)
  return sprite
}

NeuroCanvas.prototype.onViewModeNeuronDragStart = function (sprite, event) {
  var self = this
  // store a reference to the data, the reason for this is because of multitouch
  // we want to track the movement of this particular touch
  sprite.data = event.data
  self.selectedNode = self.neuralNetwork.getNode(sprite.neuronID)
  sprite.dragging = true
  self.draggingSprite = true
}
NeuroCanvas.prototype.onViewModeNeuronDragEnd = function (sprite, event) {
  var self = this
  if (sprite.dragging) { // sync neuron position when drag end.
    var newPosition = sprite.data.getLocalPosition(sprite.parent)
    var node = self.neuralNetwork.getNode(sprite.neuronID)
    var nodeData = {
      id: node.id,
      x: newPosition.x,
      y: newPosition.y
    }
    self.neuralNetwork.updateNode(nodeData, true)
  }
  sprite.dragging = false
  if (sprite.data === event.data) {
    self.selectedNode = self.neuralNetwork.getNode(sprite.neuronID)
    self.emit('neuronSelected', self.selectedNode.id)
  } else {
    self.selectedNode = null
  }
  // set the interaction data to null
  sprite.data = null
  self.pointerupTracker = true // instead of event.stopPropagation()
  self.draggingSprite = false
}
NeuroCanvas.prototype.onViewModeNeuronDragMove = function (sprite, event) {
  var self = this
  if (sprite.dragging) {
    var newPosition = sprite.data.getLocalPosition(sprite.parent)
    var node = self.neuralNetwork.getNode(sprite.neuronID)
    node.x = newPosition.x
    node.y = newPosition.y
    // var nodeData = { // do not sync when neuron is in dragging. For less traffic.
    //   id: node.id,
    //   x: newPosition.x,
    //   y: newPosition.y
    // }
    // self.neuralNetwork.updateNode(nodeData, true)
  }
}

NeuroCanvas.prototype.onEditModeNeuronDragStart = function (sprite, event) {
  var self = this
  self.selectedNode = self.neuralNetwork.getNode(sprite.neuronID)
  self.tempArrow.data = event.data
  self.draggingArrow = true
}
NeuroCanvas.prototype.onEditModeNeuronDragEnd = function (sprite, event) {
  var self = this
  self.draggingArrow = false
  if (!self.selectedNode || !sprite) return
  var node = self.neuralNetwork.getNode(sprite.neuronID)
  if (self.selectedNode !== node) {
    // create new route
    var linkData = { source: self.selectedNode.id, target: node.id }
    var checkExist = self.neuralNetwork.getLink(linkData.source, linkData.target)
    if (checkExist) {
      console.log('route already exist')
      return
    }
    self.neuralNetwork.addLink(linkData, true)
    var routedata = self.neuralNetwork.getLink(linkData.source, linkData.target)
    linkData.sprite = self.createRoute(linkData.source, linkData.target, self.linkClip, routedata)
  }
}
// NeuroCanvas.prototype.onEditModeNeuronDragMove = function (sprite, event) {
//   var self = this
// }

/**
 * Create Neuron Route Arrow
 */
NeuroCanvas.prototype.createRoute = function (sourceId, targetId, stage, route) {
  var self = this
  stage = stage || this.linkClip

  var source = self.neuralNetwork.getNode(sourceId)
  var target = self.neuralNetwork.getNode(targetId)
  if (!source || !target) return

  // create our Neuron sprite
  var sprite = new PIXI.Graphics()
  var dx = target.x - source.x
  var dy = target.y - source.y
  var dist = Math.sqrt(dx * dx + dy * dy)
  var angle = Math.atan2(dy, dx)
  // sprite.beginFill(0xAAAAAA, 0)
  drawArrow(sprite, dist, route.value)
  sprite.interactive = true
  sprite.buttonMode = true
  sprite.routeID = route.source + TO + route.target

  // the pointer events takes mouse + touch events
  sprite
     .on('pointerdown', function (event) {
       if (self.canvasState === CANVAS_STATE.view) {
         self.onViewModeDragArrowStart(this, event)
       }
       event.stopPropagation()
     })
     .on('pointerup', function (event) {
       if (self.canvasState === CANVAS_STATE.view) {
         self.onViewModeDragArrowEnd(this, event)
       }
     })
     .on('pointerupoutside', function (event) {
       if (self.canvasState === CANVAS_STATE.view) {
         self.onViewModeDragArrowEnd(this, event)
       }
     })
     .on('pointermove', function (event) {
       if (self.canvasState === CANVAS_STATE.view) {
         // self.onViewModeDragArrowMove(this, event)
       }
     })
     // For mouse-only events, use mouse*
     // For touch-only events, use touch*

  // move the sprite to its designated position
  sprite.x = source.x
  sprite.y = source.y
  sprite.rotation = angle
  // add it to the stage
  stage.addChild(sprite)
  return sprite
}
NeuroCanvas.prototype.onViewModeDragArrowStart = function (sprite, event) {
  var self = this
  self.selectedLink = null
  sprite.data = event.data
}
NeuroCanvas.prototype.onViewModeDragArrowEnd = function (sprite, event) {
  var self = this
  if (sprite.data === event.data && sprite.data) {
    self.selectedLink = self.neuralNetwork.getLink(sprite.routeID)
    self.selectedNode = self.neuralNetwork.getNode(self.selectedLink.target)
    self.emit('neuronSelected', self.selectedNode.id)
  } else {
    self.selectedLink = null
  }
}
NeuroCanvas.prototype.keydown = function (event) {
  var self = this
  // event.preventDefault()

  if (self.holdedKey !== -1) {
    self.holdedKey = -1
    return
  }
  self.holdedKey = event.keyCode

  // ctrl
  if (self.holdedKey === 17) {
  }

  if (!self.selectedNode && !self.selectedLink) return

  switch (self.holdedKey) {
    case 8: // backspace
    case 46: // delete
      if (self.selectedNode) {
        self.nodeClip.removeChild(self.selectedNode.sprite)
        self.neuroPanel.recieveNodeChange({
          type: 'delete',
          value: { id: self.selectedNode.id }
        })
        self.neuralNetwork.deleteNode({
          id: self.selectedNode.id
        }, true)
        for (var i = self.neuralNetwork.neuronData.links.length - 1; i >= 0; i--) {
          var link = self.neuralNetwork.neuronData.links[i]
          if (link.source === self.selectedNode.id || link.target === self.selectedNode.id) {
            self.linkClip.removeChild(link.sprite)
            self.neuroPanel.recieveNodeChange({
              type: 'delete',
              value: {
                source: link.source,
                target: link.target
              }
            })
            self.neuralNetwork.deleteLink({
              source: link.source,
              target: link.target
            }, true)
          }
        }
      } else if (self.selectedLink) {
        // self.neuralNetwork.neuronData.links.splice(self.neuralNetwork.neuronData.links.indexOf(self.selectedLink), 1)
        self.linkClip.removeChild(self.selectedLink.sprite)
        self.neuroPanel.recieveNodeChange({
          type: 'delete',
          value: {
            source: link.source,
            target: link.target
          }
        })
        self.neuralNetwork.deleteLink({
          source: self.selectedLink.source,
          target: self.selectedLink.target
        }, true)
      }
      self.selectedLink = null
      self.selectedNode = null
      break
    case 66: // B
      break
    case 76: // L
      break
    case 82: // R
      break
  }
}

NeuroCanvas.prototype.keyup = function (event) {
  var self = this
  // ctrl
  if (self.holdedKey === 17) {
  }
  self.holdedKey = -1
}

NeuroCanvas.prototype.syncDeleteNeuron = function (data) {
  var self = this
  var node = self.neuralNetwork.getNode(data.id)
  self.nodeClip.removeChild(node.sprite)
}

NeuroCanvas.prototype.syncDeleteRoute = function (data) {
  var self = this
  var link = self.neuralNetwork.getLink(data.source, data.target)
  self.linkClip.removeChild(link.sprite)
}
/**
 * Utility
*/
function drawArrow (context, dist, value, color) { // create Arrow graphic
  var headlen = 15 // length of head in pixels
  // calculate margin of arrow from node.
  var sourcePadding = 18
  var targetPadding = 20
  // draw arrow body
  color = color || ((value > 0) ? 0xFF0000 : 0x0000FF)
  var visVal = Math.abs(value) * 4 + 1
  if (visVal > 8) visVal = 8
  else if (visVal < 2) visVal = 2
  context.lineStyle(0)
  context.beginFill(color)
  context.moveTo(sourcePadding, 0 - visVal / 2)
  context.lineTo(dist - targetPadding - headlen + 2, 0 - visVal / 2)
  context.lineTo(dist - targetPadding - headlen + 2, 0 + visVal / 2)
  context.lineTo(sourcePadding, 0 + visVal / 2)
  context.moveTo(sourcePadding, 0 - visVal / 2)
  context.endFill()
  // draw arrow head
  context.lineStyle(0)
  context.beginFill(color)
  context.moveTo(dist - targetPadding, 0)
  context.lineTo(dist - targetPadding - headlen * Math.cos(0 - Math.PI / 6), headlen * Math.sin(0 - Math.PI / 6))
  context.lineTo(dist - targetPadding - headlen * Math.cos(0 + Math.PI / 6), headlen * Math.sin(0 + Math.PI / 6))
  context.lineTo(dist - targetPadding, 0)
  context.endFill()
}

function neuronGroupColor (value) {
  if (value === 'input') {
    return '0xFF0000'
  } else if (value === 'output') {
    return '0x0000FF'
  } else if (value === 'selftrain') {
    return '0xEEEEEE'
  } else {
    var number = parseInt(value) * (359 / 11)
    var color = hslToHexColor(number, 100, 65, '0x')
    return color
  }
}
/**
 * Detect the amount of distance the wheel has traveled and normalize it based on browsers.
 * @param  event
 * @return integer
 */
// function wheelDistance (event) {
//   var w = event.wheelDelta
//   var d = event.detail
//   if (d) {
//     if (w) return w / d / 40 * d > 0 ? 1 : -1 // Opera
//     else return -d / 3 // Firefox;         TODO: do not /3 for OS X
//   } else return w / 120 // IE/Safari/Chrome TODO: /3 for Chrome OS X
// }

/**
 * Detect the direction that the scroll wheel moved
 * @param event
 * @return integer
 */
function wheelDirection (event) {
  return (event.detail < 0) ? 1 : (event.wheelDelta > 0) ? 1 : -1
}

module.exports = NeuroCanvas
