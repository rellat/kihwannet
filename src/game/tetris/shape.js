var SeedRandom = require('seedrandom')

function Shape (randomSeed) {
  var self = this

  if (!(self instanceof Shape)) return new Shape(randomSeed)

  self.BLOCKS = [
    [
        [0, 12, 12, 0],
        [0, 0, 12, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    [
      [0, 11, 11, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ]
    // [
    //     [0, 0, 0, 0],
    //     [0, 11, 11, 0],
    //     [0, 11, 11, 0],
    //     [0, 0, 0, 0]
    // ],
    // [
    //     [0, 0, 12, 0],
    //     [0, 0, 12, 0],
    //     [0, 0, 12, 0],
    //     [0, 0, 12, 0]
    // ],
    // [
    //     [0, 0, 0, 0],
    //     [0, 13, 13, 0],
    //     [0, 0, 13, 13],
    //     [0, 0, 0, 0]
    // ],
    // [
    //     [0, 0, 0, 0],
    //     [0, 0, 14, 14],
    //     [0, 14, 14, 0],
    //     [0, 0, 0, 0]
    // ],
    // [
    //     [0, 0, 15, 0],
    //     [0, 15, 15, 0],
    //     [0, 0, 15, 0],
    //     [0, 0, 0, 0]
    // ],
    // [
    //     [0, 16, 0, 0],
    //     [0, 16, 0, 0],
    //     [0, 16, 16, 0],
    //     [0, 0, 0, 0]
    // ],
    // [
    //     [0, 0, 17, 0],
    //     [0, 0, 17, 0],
    //     [0, 17, 17, 0],
    //     [0, 0, 0, 0]
    // ]
  ]

  self.randomSeed = randomSeed || Date.now()
  self.random = SeedRandom(self.randomSeed)

  self.X = 0
  self.Y = 0

  self.currentBlock = self.randomBlock()
  self.nextBlock = self.randomBlock()

  self.holdBlock = {
    array: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],

    type: -1
  }
}

Shape.prototype.setCurrentBlock = function (array) {
  var self = this
  self.currentBlock.array = array
}

Shape.prototype.hold = function () {
  var self = this
    /* hold블록이 비어있으면 currentBlock에 nextblock을 넣어줘야 한다. */

  if (self.holdBlock.type === -1) {
    self.holdBlock = self.currentBlock
    self.currentBlock = self.nextBlock
    self.nextBlock = self.randomBlock()
  } else {
    var temp = self.holdBlock
    self.holdBlock = self.currentBlock
    self.currentBlock = temp
  }

  self.X = 3
  self.Y = 0
}

Shape.prototype.changeCurrentToNext = function () {
  var self = this

  self.currentBlock = self.nextBlock
  self.nextBlock = self.randomBlock()

  self.X = 0
  self.Y = 0
}

Shape.prototype.goDown = function () {
  var self = this

  self.Y++
}

Shape.prototype.randomBlock = function () {
  var self = this
  var index = Math.floor(self.random() * self.BLOCKS.length)

  return {
    array: self.BLOCKS[index],
    type: index
  }
}

Shape.prototype.rotateRight = function () {
  var self = this
  var block = self.currentBlock.array

  return [
    [block[3][0], block[2][0], block[1][0], block[0][0]],
    [block[3][1], block[2][1], block[1][1], block[0][1]],
    [block[3][2], block[2][2], block[1][2], block[0][2]],
    [block[3][3], block[2][3], block[1][3], block[0][3]]
  ]
}

Shape.prototype.rotateLeft = function () {
  var self = this
  var block = self.currentBlock.array

  return [
    [block[0][3], block[1][3], block[2][3], block[3][3]],
    [block[0][2], block[1][2], block[2][2], block[3][2]],
    [block[0][1], block[1][1], block[2][1], block[3][1]],
    [block[0][0], block[1][0], block[2][0], block[3][0]]
  ]
}

module.exports = Shape
