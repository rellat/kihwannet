/* global PIXI */
var Container = PIXI.Container
var loader = PIXI.loader
var Sprite = PIXI.Sprite
var Graphics = PIXI.Graphics

var birdAnimationStates = [
  'yellow-bird-1.png',
  'yellow-bird-2.png',
  'yellow-bird-3.png',
  'yellow-bird-2.png'
]
// Constants
var OPEN_SPACE_HEIGHT = 201
var MAX_ROTATION = Math.PI / 2 - 0.2
var MIN_ROTATION = -Math.PI / 10
var DAY_LENGTH = 1000

// board count
var XCOUNT = 10
var YCOUNT = 20

function Scene (options) { // width, height, container
  var self = this
  self.turn = 0
  self.miliSecForTurn = 1000 // 1 second
  self.prevTick = 0
  self.tickForTurn = 0
  self.board = []
  for (var i = 0; i < YCOUNT; i++) {
    self.board.push([])
    for (var j = 0; j < XCOUNT; j++) {
      self.board[i].push(0)
    }
  }
  // self.prevSize = { width: options.width || 800, height: options.height || 600 }

  // PIXI renderer setting
  self.renderer = PIXI.autoDetectRenderer(144, 256,
    { antialias: true, transparent: !0, resolution: 2 })
  self.container = options.container || document.body
  self.container.style.width = '288px'
  self.container.style.height = '512px'
  self.container = options.container || document.body
  self.container.appendChild(self.renderer.view)

  self.xsize = self.renderer.width / XCOUNT / 2
  self.ysize = self.renderer.height / YCOUNT / 2

  self.stage = new Container()
  // self.stage.x = 0
  // self.stage.y = 0

  self.scoreContainer = null
  self.id = null
  self.state = null
  self.gameTime = null
  self.isDay = null

  // Sprites
  self.background = null
  self.darkBackground = null
  self.bird = null
  self.floor = null
  self.gameOver = null
  self.pipes = null

  self.birdAnimationStatesIterator = {
    animationState: -1,
    [Symbol.iterator] () { return this },

    next (bird) {
      if (this.animationState > 2) {
        this.animationState = 0
      } else {
        this.animationState += 1
      }

      if (bird.vy >= 2.5) {
        this.animationState = 1
      }

      return { value: birdAnimationStates[this.animationState], done: false }
    }
  }

  self.lastPipe = null
  self.animationId = null

  loader.add(['/img/fbird/sprites.json']).load(function (loader, resources) {
    console.log('PIXI loading complete ')
    // console.log('PIXI loading complete ' + JSON.stringify(resources))

    // Object which refers to sprites in atlas
    self.id = loader.resources['/img/fbird/sprites.json'].textures
    // console.log(self.id['night-bg.png'])
    self.init()
  })
  loader.onError.add(function () {
    console.log('PIXI loading error ')
  })
  loader.onProgress.add(function () {
    console.log('PIXI loading progress ')
  }) // called once per loaded/errored file
}

Scene.prototype.init = function () {
  var self = this
  self.gameTime = 0
  self.isDay = true
  self.birdAnimationStatesIterator.animationState = -1
  self.PIPE_SEPARATION = self.renderer.width * 1
  self.gameSpeed = 1
  self.currentGapSize = 70
  self.gameScore = 0
  self.pipes = []

  // Adds night background
  self.darkBackground = new Sprite(self.id['night-bg.png'])
  self.stage.addChild(self.darkBackground)

  // Adds day background
  self.background = new Sprite(self.id['day-bg.png'])
  self.stage.addChild(self.background)

  // Adds the floor
  self.floor = new Sprite(self.id['floor.png'])
  self.floor.y = OPEN_SPACE_HEIGHT
  self.stage.addChild(self.floor)

  // Adds bird
  self.bird = new Sprite(self.id[birdAnimationStates[0]])
  self.bird.y = (OPEN_SPACE_HEIGHT / 2) - (self.bird.height / 2) + 10
  self.bird.x = (self.stage.width / 2) - (40)
  self.bird.pivot.set(self.bird.width / 2, self.bird.height / 2)
  // Bird physics properties
  self.bird.vy = 0
  self.bird.ay = 0.12
  self.stage.addChild(self.bird)

  // Adds a pipe
  var pipeContainer = self.generatePipeContainer(OPEN_SPACE_HEIGHT / 2)
  pipeContainer.x = self.renderer.width
  self.pipes.push(pipeContainer)
  self.stage.addChild(pipeContainer)

  // Adds a score container + scores
  self.scoreContainer = new Container()
  var zeroNum = new Sprite(self.id['0.png'])
  self.scoreContainer.x = (self.renderer.width / 4) - ((zeroNum.width / 2) - 1)
  self.scoreContainer.y = OPEN_SPACE_HEIGHT / 10
  self.scoreContainer.addChild(zeroNum)
  self.stage.addChild(self.scoreContainer)

  self.boardClip = new Graphics()
  self.stage.addChild(self.boardClip)

  self.state = 'start'
}

Scene.prototype.gameLoop = function (delta) {
  var self = this
  if (!self.state) return

  // draw
  self.turn = (self.turn + 1) % 3 // frame skip
  if (self.turn === 0) {
    if (!self.go()) {
      self.reset()
    }
  }
  // draw board
  self.board = self.getBoard()
  // console.log(JSON.stringify(self.board))
  self.boardClip.clear()
  for (var i = 0; i < self.board.length; i++) {
    for (var j = 0; j < self.board[i].length; j++) {
      var element = self.board[i][j]
      self.boardClip.lineStyle(0, 0xFFFFFF)
      self.boardClip.beginFill(element > 0 ? 0x70FFFF : 0x444444, 0.2)
      self.boardClip.drawRect(j * self.xsize, i * self.ysize, self.xsize - 1, self.ysize - 1)
      self.boardClip.endFill()
    }
  }

  self.renderer.render(self.stage)
}

function intersects (r1from, r1to, r2from, r2to) {
  return !(r2from.x >= r1to.x || r2to.x <= r1from.x || r2from.y >= r1to.y || r2to.y <= r1from.y)
}

Scene.prototype.getBoard = function () {
  var self = this

  for (var i = 0; i < self.board.length; i++) {
    for (var j = 0; j < self.board[i].length; j++) {
      var boxLeftX = j * self.xsize
      var boxRightX = boxLeftX + self.xsize
      var boxTopY = i * self.ysize
      var boxBottomY = boxTopY + self.ysize
      self.board[i][j] = 0

      var birdRightX = self.bird.x + self.bird.width / 2
      var birdLeftX = self.bird.x - self.bird.width / 2
      var birdTopY = self.bird.y - self.bird.height / 2
      var birdBottomY = self.bird.y + self.bird.height / 2

      if (intersects({ x: boxLeftX, y: boxTopY },
        { x: boxRightX, y: boxBottomY },
        { x: birdLeftX, y: birdTopY },
        { x: birdRightX, y: birdBottomY })) {
        self.board[i][j] = 1
      }

      self.pipes.forEach(function (pipe) {
        // Between pipe space in X
        if (boxRightX > pipe.x + 5 && boxLeftX < pipe.x + pipe.width - 5) {
          var upPipe = pipe.children[0]
          var downPipe = pipe.children[1]

          if (boxTopY < downPipe.getGlobalPosition().y - self.currentGapSize - 5 ||
            boxBottomY > upPipe.getGlobalPosition().y + upPipe.height + self.currentGapSize + 5) {
            self.board[i][j] = 1
          }
        }
      })
    }
  }
  return self.board
}

Scene.prototype.go = function () {
  var self = this

  // Add time
  self.gameTime += 1

  // Animate the bird
  self.animateBirdPlay()

  // Animate the floor
  self.animateGround(self.gameSpeed)

  // Generate some pipes
  self.generatePipes()

  // Animate pipes
  self.animatePipes(self.gameSpeed)

  // Check for collisions
  if (self.checkCollisions() === true) {
    self.bird.vy = 0
    return false
  }

  // Make gaps smaller
  if (self.currentGapSize > 48) {
    self.currentGapSize -= 0.01
  }
  // Make pipes closer together
  if (self.PIPE_SEPARATION > self.renderer.width * 0.35) {
    self.PIPE_SEPARATION -= 0.075
  }
  // Speed up the ground
  if (self.gameSpeed < 1.3) {
    self.gameSpeed += 0.0002
  }

  if (self.gameTime % DAY_LENGTH === DAY_LENGTH - 1) {
    self.isDay = !self.isDay
  }

  if (self.isDay) {
    if (self.background.alpha < 1) {
      self.background.alpha += 0.005
    }
  }

  if (!self.isDay) {
    if (self.background.alpha > 0) {
      self.background.alpha -= 0.005
    }
  }

  self.calculateAndSetScore()

  self.displayScore(self.gameScore)
  return true
}
Scene.prototype.reset = function () {
  var self = this
  self.stage.removeChildren()

  self.init()
}
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
  if (actions[0]) {
    self.bird.vy = -2.75
  }
}

Scene.prototype.calculateAndSetScore = function (deletedLineNum) {
  var self = this
  self.pipes.forEach(function (pipe) {
    if (pipe !== self.lastPipe && (Math.abs(pipe.x + pipe.width) - (self.bird.x + (self.bird.width / 2))) < 1) {
      self.lastPipe = pipe
      self.gameScore += 1
    }
  })
}

Scene.prototype.animateBirdPlay = function () {
  var self = this
  // Animate the bird's vertical position
  self.bird.vy += self.bird.ay
  self.bird.y += self.bird.vy

  // Animate the bird's rotation
  if (self.bird.vy > 0 && self.bird.rotation < MAX_ROTATION) {
    self.bird.rotation += 0.04 * self.bird.vy
  } else if (self.bird.vy < 0 && self.bird.rotation > MIN_ROTATION) {
    self.bird.rotation -= 0.4
  }

  // Check if the bird has collided with the ceiling
  if (self.bird.y - (self.bird.height / 2) < 0) {
    self.bird.y = self.bird.height / 2
    self.bird.vy = 0
  }
}

Scene.prototype.animateGround = function (speed) {
  var self = this
  self.floor.x -= speed

  if (self.floor.x < -23.5) {
    self.floor.x = 0
  }
}

Scene.prototype.generatePipes = function () {
  var self = this
  if (self.pipes[0].x < -(self.id['down-green-pipe.png'].width)) {
    self.pipes.splice(0, 1)
    return
  }

  var stopGeneratingAt = self.renderer.width * 2
  var centerPoint = Math.random() * ((OPEN_SPACE_HEIGHT - self.currentGapSize) - (self.currentGapSize)) + self.currentGapSize
  var currentPosition = self.pipes.slice(-1)[0].x + self.PIPE_SEPARATION

  while (currentPosition < stopGeneratingAt) {
    var pipeContainer = self.generatePipeContainer(centerPoint, currentPosition)
    pipeContainer.x = currentPosition

    self.pipes.push(pipeContainer)
    self.stage.addChild(pipeContainer)
    // Move the floor to the front
    self.stage.setChildIndex(self.floor, self.stage.children.length - 1)

    currentPosition += self.PIPE_SEPARATION
  }
}

Scene.prototype.generatePipeContainer = function (center) {
  var self = this
  var pipeContainer = new Container()
  var upPipe = new Sprite(self.id['up-green-pipe.png'])
  var downPipe = new Sprite(self.id['down-green-pipe.png'])

  upPipe.x = 0
  upPipe.y = center - (self.currentGapSize / 2) - upPipe.height
  upPipe.vx = -self.gameSpeed
  downPipe.x = 0
  downPipe.y = center + (self.currentGapSize / 2)
  downPipe.vx = -self.gameSpeed
  pipeContainer.addChild(upPipe)
  pipeContainer.addChild(downPipe)

  return pipeContainer
}

Scene.prototype.animatePipes = function (speed) {
  var self = this
  self.pipes.forEach((pipe) => {
    pipe.x -= speed
  })
}

Scene.prototype.checkCollisions = function () {
  var self = this
  var collided = false

  // Check if the bird has collided with the ground
  if (self.bird.y + (self.bird.height / 2) > OPEN_SPACE_HEIGHT) {
    // YOU LOST!!
    self.bird.y = OPEN_SPACE_HEIGHT - (self.bird.height / 2)
    collided = true
  }

  // Check if the bird has collided with a pipe
  var birdRightX = self.bird.x + self.bird.width / 2
  var birdLeftX = self.bird.x - self.bird.width / 2
  var birdTopY = self.bird.y - self.bird.height / 2
  var birdBottomY = self.bird.y + self.bird.height / 2

  self.pipes.forEach(function (pipe) {
    // Between pipe space in X
    if (birdRightX > pipe.x + 5 && birdLeftX < pipe.x + pipe.width - 5) {
      var upPipe = pipe.children[0]
      var downPipe = pipe.children[1]

      if (birdTopY < downPipe.getGlobalPosition().y - self.currentGapSize - 5 ||
        birdBottomY > upPipe.getGlobalPosition().y + upPipe.height + self.currentGapSize + 5) {
        collided = true
      }
    }
  })

  return collided
}

Scene.prototype.displayScore = function (score) {
  var self = this
  const digits = String(score)
    .split('')
    .map(d => `${d}.png`)

  self.scoreContainer.removeChildren()

  digits.forEach((digit) => {
    const sprite = new Sprite(self.id[digit])
    let lastChildWidth = 0
    let lastChildX = 0

    if (self.scoreContainer.children.length > 0) {
      const lastChild = self.scoreContainer.getChildAt(self.scoreContainer.children.length - 1)
      lastChildWidth = lastChild.width
      lastChildX = lastChild.x
    }

    sprite.x = lastChildX + lastChildWidth + 1
    self.scoreContainer.addChild(sprite)
    self.stage.setChildIndex(self.scoreContainer, self.stage.children.length - 1)
  })

  // Center the scoreContainer
  self.scoreContainer.x = (self.renderer.width / 4) - (self.scoreContainer.width / 2)
}

module.exports = Scene
