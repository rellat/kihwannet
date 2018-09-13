var NeuralNetwork = require('./neuralnetwork')

// Game Setting
// var XorGame = require('./game/xor/drawing')
// var FlappyBirdGame = require('./game/fbird/drawing')
var DynamicOutputGame = require('./game/dynamicout/worker')
var TetrisGame = require('./game/tetris/worker')

module.exports = function (worker) {
  var ENV_LIST = {
    'dynamicout': DynamicOutputGame,
    // 'xor': XorGame,
    // 'flappybird': FlappyBirdGame,
    'tetris': TetrisGame
  }

  var Evolve = function () {
    var self = this
    self.pool = []
    self.targetGame = null
    self.iterate = 0
    self.matingSeason = 1000
    self.limitSize = 100
    self.selectRate = 0.1
    self.mutateRate = 0.1
    self.interval = undefined
  }

  Evolve.prototype.init = function (options) {
    var self = this
    while (self.pool[0]) { self.pool.pop() }

    self.targetGame = options.inputGame || 'dynamicout'
    self.limitSize = options.size || self.limitSize
    self.matingSeason = options.matingSeason || self.matingSeason
    self.selectRate = options.selectRate || self.selectRate
    self.mutateRate = options.mutateRate || self.mutateRate
    for (var i = 0; i < self.limitSize * 0.1; i++) {
      var obj = {
        neuralNetwork: new NeuralNetwork({}),
        inputGame: new ENV_LIST[self.targetGame]({}),
        score: 0
      }
      if (options.networkdata) obj.neuralNetwork.importAsJSON(options.networkdata)
      self.pool.push(obj)
    }

    if (self.interval) clearTimeout(self.interval)
    function loopInterval () {
      self.loop()
      self.interval = setTimeout(loopInterval, 0)
    }
    loopInterval()
  }

  Evolve.prototype.loop = function () {
    var self = this
    self.iterate++
    // worker.postMessage('iter: ' + self.iterate)

    // process network
    for (var i = 0; i < self.pool.length; i++) {
      self.pool[i].inputGame.gameLoop()
      self.pool[i].neuralNetwork.process(self.pool[i].inputGame.getEnvironmentData())
      self.pool[i].inputGame.pushAction(self.pool[i].neuralNetwork.getOutput())
    }

    // decide population - think it as mating season
    if (self.iterate % self.matingSeason === 0) self.populate()
  }

  Evolve.prototype.populate = function () {
    var self = this
    // calc cost : fitness
    for (var i = 0; i < self.pool.length; i++) {
      var score = self.pool[i].inputGame.getScore()
      self.pool[i].score = score
    }

    // sort
    self.pool.sort(function (a, b) {
      if (a.score > b.score) { return -1 }
      if (a.score < b.score) { return 1 }
      return 0
    })
    // console.log('get score?!' + self.pool[0].score)

    // select
    var selectedNum = Math.floor(self.pool.length * self.selectRate)
    for (var j = 0; j < selectedNum; j++) {
      var tartgetObj = self.pool[Math.floor(Math.random() * self.pool.length * self.selectRate)]
      // crossover
      var newGene = self.pool[j].neuralNetwork.crossover(tartgetObj.neuralNetwork.saveAsJSON())
      var newobj = {
        neuralNetwork: new NeuralNetwork({}),
        inputGame: new ENV_LIST[self.targetGame]({}),
        score: tartgetObj.score
      }
      newobj.neuralNetwork.importAsJSON(newGene)
      // mutate
      newobj.neuralNetwork.mutate(self.mutateRate * 0.5)
      self.pool.unshift(newobj)
      // self.pool.splice(selectedNum, 0, newobj)
    }
    for (var k = j; k < Math.min(self.pool.length, self.limitSize); k++) {
      self.pool[k].neuralNetwork.mutate(self.mutateRate)
      self.pool[k].inputGame.reset()
    }
    for (var l = k; l < self.pool.length; l++) {
      self.pool.pop()
    }

    var genes = []
    for (var m = 0; m < 10; m++) {
      genes.push({
        network: self.pool[m].neuralNetwork.saveAsJSON(),
        score: self.pool[m].score
      })
    }

    var postdata = {
      type: 'update',
      data: genes
    }
    worker.postMessage(postdata)
  }

  Evolve.prototype.onmessage = function (messege) {
    var self = this
    switch (messege.type) {
      case 'init':
        self.init(messege.data)
        break
      default:
        break
    }
  }

  var evolve = new Evolve()

  worker.onmessage = function (e) {
    evolve.onmessage(e.data)
  }
}
