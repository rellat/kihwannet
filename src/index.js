var NeuroCanvas = require('./neurocanvas')
var NeuroPanel = require('./neurocontrol')
var NeuralNetwork = require('./neuralnetwork')
var Evolve = require('./evolve')

function NeuroEditor (options) {
  var self = this
  options = options || {}
  self.title = options.title || 'no name'
  self.container = options.container || document.createElement('div')
  self.container.className = 'editor-view'
  self.bindedTab = null

  var dom = options.textarea
  if (!dom) {
    dom = document.createElement('div')
    dom.className = 'view neuro-editor'
    self.container.appendChild(dom)
  }
  self.dom = dom

  self.neuralNetwork = null
  self.neuroCanvas = null
  self.neuroPanel = null
}

NeuroEditor.prototype.open = function () {
  var self = this

  self.neuralNetwork = new NeuralNetwork({ contentID: null })
  // self.neuralNetwork.on('changeNode', function (data) {
  //   self.emit('changeNode', data)
  // })
  // self.neuralNetwork.on('changeLink', function (data) {
  //   self.emit('changeLink', data)
  // })

  var canvasview = document.createElement('div')
  canvasview.className = 'neuro-editor-canvas'
  var neurogamedom = document.createElement('div')
  neurogamedom.className = 'neuro-editor-game'
  var neuropaneldom = document.createElement('div')
  neuropaneldom.className = 'neuro-editor-panel'
  self.dom.appendChild(canvasview)
  self.dom.appendChild(neurogamedom)
  self.dom.appendChild(neuropaneldom)

  self.neuroPanel = new NeuroPanel({
    container: neuropaneldom,
    neuralNetwork: self.neuralNetwork,
    inputGameDom: neurogamedom
  })
  self.neuroCanvas = new NeuroCanvas({
    width: canvasview.clientWidth,
    height: canvasview.clientHeight,
    container: canvasview,
    neuroPanel: self.neuroPanel,
    neuralNetwork: self.neuralNetwork
  })

  self.neuroCanvas.on('neuronSelected', self.neuroPanel.selectNeuron.bind(self.neuroPanel))

  self.neuroCanvas.initCanvas()

  self.neuroPanel.initPanel()

  window.NeuralNetwork = self.neuralNetwork

  var testnet = require('../data/tetris180502.json')
  // var testnet = require('../data/tetris180531.json')
  // var testnet = require('../data/d.json')

  self.evolve = new Evolve({})
  self.evolve.distribute({
    networkdata: testnet,
    inputGame: 'tetris',
    size: 1000,
    matingSeason: 300,
    selectRate: 0.01,
    mutateRate: 0.1
  })
  self.evolve.on('result', function (data) {
    self.neuralNetwork.importAsJSON(data)
  })
}

window.onload = function () {
  var editor = new NeuroEditor()
  document.body.appendChild(editor.container)
  editor.open()
}
