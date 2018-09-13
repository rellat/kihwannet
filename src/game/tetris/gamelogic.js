var global = require('./global')
var Shape = require('./shape')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(TetrisGame, EventEmitter)

/* 전체적으로 게임을 진행시키기 위한 데이터와 메소드를 담고있는 객체 */
function TetrisGame (options) {
  var self = this
  if (!(self instanceof TetrisGame)) return new TetrisGame(options)

  self.id = options.clientId || 'offline'
  self.roomId = options.roomId || 'offline'
  self.order = options.order || 1

  self.history = []
  self.sequenceNumber = 0
    // 클라이언트에서만 사용하는 배열
  self.pendingInputs = []
  self.messages = []
    // 서버에서만 사용하는 배열
  self.processedInputs = []

    // key flags
  self.key_right = false
  self.key_left = false
  self.key_up = false
  self.key_down = false
  self.key_shift = false
  self.key_a = false
  self.key_s = false
  self.key_space = false

  self.isGameOver = false
  self.isPause = false
  self.holdable = true

  self.block = new Shape(options.randomSeed || 'some random seed')

  self.startX = 0
  self.score = 0

  self.board = []

  for (var i = 0; i < global.BOARD_HEIGHT; i++) {
    self.board[i] = []
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
      self.board[i][j] = 0
    }
  }
}

TetrisGame.prototype.doAction = function (input) {
  var self = this
  var validate = false
  switch (input) {
    case 'left':
      validate = self.move(0, -1, self.block.currentBlock.array)
      break
    case 'right':
      validate = self.move(0, 1, self.block.currentBlock.array)
      break
    case 'down':
      validate = self.move(1, 0, self.block.currentBlock.array)
      break
    case 'rotate':
      validate = self.rotate('right')
      break
  }
  if (!validate) {
    // console.log('do nothing')
  }
}

/*
TetrisGame.prototype.pushHistory = function (time, seed, type, message) {
    var self = this;
    self.randomSeed = seed;
    // push action to history log
    self.history.push({ time: time, owner: self.id, seed: seed, type: type, message: message })
};
*/
/* interval 함수의 인자로 쓰일 함수이다. 시간 간격 이후에 할 일을 정의한다.
1. 현재 Gameover 상태인지 체크한다.
2. 현재 블록이 내려갔을때 겹치는지 체크한다.
  2-1. 겹치면 블록을 현재 위치에 적용시킨다
  2-2. 블록이 한 줄 다 채워졌는지 체크하여 지운다.
  2-3. 만약 새로나올 블록의 위치에 어떤 블록이 나오면 Gameover 상태로 바꾼다.
  2-4. 그게 아니라면 다음 블록을 내보낸다.

3.  겹치지 않는다면 블록을 한 칸 내린다.
*/

TetrisGame.prototype.go = function () {
  var self = this

  if (self.getisGameover()) {
    return false
  }

  if (self.intersectCheck(self.block.Y + 1, self.block.X, self.block.currentBlock.array)) {
    self.board = self.applyCurrentBlockToBoard(self.block.Y, self.block.X)

    self.deleteLine()
    self.holdable = true

    if (self.intersectCheck(0, 0, self.block.nextBlock.array)) {
      self.setIsGameover(true)
    } else {
      self.block.changeCurrentToNext()
    }
  } else {
    self.block.goDown()
  }
  // console.log(JSON.stringify(self.board))
  return true
}

TetrisGame.prototype.reset = function () {
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

TetrisGame.prototype.calculateAndSetScore = function (deletedLineNum) {
  var self = this

  self.score += deletedLineNum * deletedLineNum * 10
}

TetrisGame.prototype.intersectCheck = function (y, x, block) {
  var self = this
  var board = self.board

  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (block[i][j]) {
        if (i + y >= global.BOARD_HEIGHT || j + x >= global.BOARD_WIDTH || j + x < 0 || board[y + i][x + j]) {
          return true
                    /* 움직였을 때 어떤 물체 또는 board 끝에 겹침을 뜻함 */
        }
      }
    }
  }
  return false
}

TetrisGame.prototype.applyCurrentBlockToBoard = function (y, x) {
  var self = this
  var board = self.board
  var block = self.block.currentBlock.array

  var newBoard = []

  for (var i = 0; i < global.BOARD_HEIGHT; i++) {
    newBoard[i] = board[i].slice()
  }

  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      if (block[i][j]) {
        newBoard[i + y][j + x] = block[i][j]
      }
    }
  }
  return newBoard
}

TetrisGame.prototype.deleteLine = function () {
  var self = this
  var board = self.board

  var newBoard = []
  var count = global.BOARD_HEIGHT
  for (var i = global.BOARD_HEIGHT; i-- > 0;) {
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
      if (!board[i][j]) {
                /* 0인 성분이 있으면 한줄이 다 안 채워진 것이므로 붙여넣기 해 준다. */
                /* --count로 아래부터 새로운 board를 채워주는 이유는 맨 아래줄부터 1로 채워진 줄이 있다면 자동적으로
                새로운 board에는 추가되지 않기 때문이다. 이 이후에 맨위부터 count까지는 0으로 채워 주어야 한다. */
        newBoard[--count] = board[i].slice()
        break
      }
    }
  }

  for (var i = 0; i < count; i++) {
    newBoard[i] = []
    for (var j = 0; j < global.BOARD_WIDTH; j++) {
      newBoard[i][j] = 0
    }
  }

  self.board = newBoard
  self.calculateAndSetScore(count)
}

TetrisGame.prototype.move = function (dy, dx, inputBlock) {
  var self = this

  if (!self.intersectCheck(self.block.Y + dy, self.block.X + dx, inputBlock)) {
    self.block.X += dx
    self.block.Y += dy
    return true
  }
  return false
}

TetrisGame.prototype.rotate = function (direction) {
  var self = this

  var newBlock

  if (direction === 'left') {
    newBlock = self.block.rotateLeft()
  } else if (direction === 'right') {
    newBlock = self.block.rotateRight()
  }

  if (!self.intersectCheck(self.block.Y, self.block.X, newBlock)) {
    self.block.setCurrentBlock(newBlock)
    return true
  }
  return false
}

TetrisGame.prototype.letFall = function () {
  var self = this
  var deltaY = 0
  while (self.move(1, 0, self.block.currentBlock.array)) {
    deltaY++
  }
  self.go()

  return deltaY
}

TetrisGame.prototype.hold = function () {
  var self = this

  if (!self.holdable) return false

  self.holdable = false
  self.block.hold()

  return true
}

TetrisGame.prototype.getId = function () {
  var self = this

  return self.id
}

TetrisGame.prototype.getStartX = function () {
  var self = this

  return self.startX
}

TetrisGame.prototype.getOrder = function () {
  var self = this
  return self.order
}

TetrisGame.prototype.getBlockX = function () {
  var self = this

  return self.block.X
}

TetrisGame.prototype.getBlockY = function () {
  var self = this

  return self.block.Y
}

TetrisGame.prototype.getisGameover = function () {
  var self = this

  return self.isGameOver
}

TetrisGame.prototype.getisPause = function () {
  var self = this

  return self.isPause
}

TetrisGame.prototype.setIsGameover = function (bool) {
  var self = this

  self.isGameOver = bool
}

TetrisGame.prototype.getScore = function () {
  var self = this

  return self.score
}
TetrisGame.prototype.getCurrentBlock = function () {
  var self = this

  return self.block.currentBlock.array
}

TetrisGame.prototype.getNextBlock = function () {
  var self = this

  return self.block.nextBlock.array
}

TetrisGame.prototype.getHoldBlock = function () {
  var self = this

  return self.block.holdBlock.array
}

TetrisGame.prototype.getHoldable = function () {
  var self = this

  return self.holdable
}

TetrisGame.prototype.getBoard = function () {
  var self = this

  return self.applyCurrentBlockToBoard(self.block.Y, self.block.X)
}

TetrisGame.prototype.getGameData = function () {
  var self = this
    /*
    return {
        id: self.id,
        startX: self.startX,
        isGameOver: self.getisGameover(),
        isPause: self.getisPause(),
        holdable: self.getHoldable(),
        score: self.getScore(),
        X: self.block.X,
        Y: self.block.Y,
        currentBlock: self.getCurrentBlock(),
        nextBlock: self.getNextBlock(),
        holdBlock: self.getHoldBlock(),
        board: self.getBoard()
    };
    */
}

module.exports = TetrisGame
