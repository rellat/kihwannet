var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(FbirdGame, EventEmitter)

var birdAnimationStates = [
  'yellow-bird-1.png',
  'yellow-bird-2.png',
  'yellow-bird-3.png',
  'yellow-bird-2.png'
]
var birdAnimationStatesIterator = {
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
// Constants
var OPEN_SPACE_HEIGHT = 201
var MAX_ROTATION = Math.PI / 2 - 0.2
var MIN_ROTATION = -Math.PI / 10
var DAY_LENGTH = 1000

/* 전체적으로 게임을 진행시키기 위한 데이터와 메소드를 담고있는 객체 */
function FbirdGame (options) {
  var self = this
  if (!(self instanceof FbirdGame)) return new FbirdGame(options)

  self.rendererWidth = options.rendererWidth || 144
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

  self.PIPE_SEPARATION = self.renderer.width * 1
  self.gameSpeed = 1
  self.currentGapSize = 70
  self.gameScore = 0
  self.lastPipe = null
  self.animationId = null
}

FbirdGame.prototype.doAction = function (input) {
  var self = this
}

FbirdGame.prototype.go = function () {
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
  if (self.PIPE_SEPARATION > self.rendererWidth * 0.35) {
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

FbirdGame.prototype.reset = function () {
  var self = this
  self.board = []
  for (var i = 0; i < global.BOARD_HEIGHT; i++) {
    self.board[i] = []
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
      self.board[i][j] = 0
    }
  }
  self.setIsGameover(false)
  // self.block.changeCurrentToNext()
}

FbirdGame.prototype.calculateAndSetScore = function (deletedLineNum) {
  var self = this
  self.pipes.forEach(function (pipe) {
    if (pipe !== self.lastPipe && (Math.abs(pipe.x + pipe.width) - (self.bird.x + (self.bird.width / 2))) < 1) {
      self.lastPipe = pipe
      self.gameScore += 1
    }
  })
}

FbirdGame.prototype.animateBirdPlay = function () {
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

FbirdGame.prototype.animateGround = function (speed) {
  var self = this
  self.floor.x -= speed

  if (self.floor.x < -23.5) {
    self.floor.x = 0
  }
}

FbirdGame.prototype.generatePipes = function () {
  var self = this
  if (self.pipes[0].x < -(self.id['down-green-pipe.png'].width)) {
    self.pipes.splice(0, 1)
    return
  }

  var stopGeneratingAt = self.rendererWidth * 2
  var centerPoint = Math.random() * ((OPEN_SPACE_HEIGHT - self.currentGapSize) - (self.currentGapSize)) + self.currentGapSize
  var currentPosition = self.pipes.slice(-1)[0].x + self.PIPE_SEPARATION

  while (currentPosition < stopGeneratingAt) {
    var pipeContainer = generatePipeContainer(centerPoint, currentPosition)
    pipeContainer.x = currentPosition

    self.pipes.push(pipeContainer)
    self.stage.addChild(pipeContainer)
    // Move the floor to the front
    self.stage.setChildIndex(self.floor, self.stage.children.length - 1)

    currentPosition += self.PIPE_SEPARATION
  }
}

FbirdGame.prototype.generatePipeContainer = function (center) {
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

FbirdGame.prototype.animatePipes = function (speed) {
  var self = this
  self.pipes.forEach((pipe) => {
    pipe.x -= speed
  })
}

FbirdGame.prototype.checkCollisions = function () {
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

  self.pipes.forEach((pipe) => {
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

FbirdGame.prototype.displayScore = function (score) {
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

FbirdGame.prototype.animateGround = function () {
  var self = this
}

module.exports = FbirdGame
