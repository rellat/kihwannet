var util = require('./util')

// Neuro Control panel
var CONTROL_STATE = {
  default: 'default',
  neuron: 'neuron',
  route: 'route'
}
var DOMID_TO_NODE = {
  neuronID: 'id',
  neuronGroup: 'group',
  sumOfWeight: 'sumofw',
  bias: 'bias',
  activateMethod: 'actMethod',
  activatedValue: 'actvalue'
}

// Game Setting
var TetrisGame = require('./game/tetris/drawing')
var XorGame = require('./game/xor/drawing')
var DynamicOutputGame = require('./game/dynamicout/drawing')
var FlappyBirdGame = require('./game/fbird/drawing')
var ENV_LIST = {
  'tetris': TetrisGame,
  'dynamicout': DynamicOutputGame,
  'xor': XorGame,
  'flappybird': FlappyBirdGame
}

function NeuroPanel (options) {
  var self = this
  self.container = options.container
  self.neuralNetwork = options.neuralNetwork
  self.inputGameDom = options.inputGameDom
  self.state = CONTROL_STATE.default

  self.selectedNeuron = null
  self.neuronEventBinder = null

  self.tdid = Math.random().toString(8).substr(2)

  var oldom = document.createElement('ol')
  var liTraningDom = document.createElement('li')
  var liNeuronDom = document.createElement('li')
  oldom.appendChild(liTraningDom)
  oldom.appendChild(liNeuronDom)
  self.container.appendChild(oldom)

  /*
  * Panel Train DOM
  */
  var tabcheck = pushElement(liTraningDom, 'input', {
    class: 'Tab-Train tab',
    type: 'checkbox',
    checked: true
  })
  var tablabel = pushElement(liTraningDom, 'label', {
    class: 'panel-tab-label',
    innerText: 'Training'
  })
  tablabel.addEventListener('click', function (e) {
    tabcheck.checked = !tabcheck.checked
  })
  var panelTrainWrap = pushElement(liTraningDom, 'div', {
    class: 'panel-content'
  })

  var panelTrainInputGame = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainInputGame, 'label', {
    for: 'inputGame' + self.tdid,
    title: 'inputGame',
    innerText: 'Input Game'
  })
  var panelTrainInputGameForm = pushElement(panelTrainInputGame, 'div', { class: 'panel-row-form' })
  self.ifaceInputGame = pushElement(panelTrainInputGameForm, 'select', {
    id: 'inputGame' + self.tdid,
    class: 'form-control input-sm',
    innerHTML: '<option value="dynamicout">dynamicout</option>' +
    '<option value="tetris">tetris</option>' +
    '<option value="xor">xor</option>' +
    '<option value="flappybird">flappybird</option>'
  })

  var panelTrainRowLearningRate = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainRowLearningRate, 'label', {
    for: 'learningRate' + self.tdid,
    title: 'learningRate',
    innerText: 'Learning Rate'
  })
  var panelTrainRowLearningRateForm = pushElement(panelTrainRowLearningRate, 'div', { class: 'panel-row-form' })
  self.ifaceLearningRate = pushElement(panelTrainRowLearningRateForm, 'input', {
    id: 'learningRate' + self.tdid,
    type: 'range',
    min: 0,
    max: 1,
    step: 0.001,
    value: 0.01
  })
  self.ifaceLearningRateValue = pushElement(panelTrainRowLearningRateForm, 'input', {
    id: 'learningRateValue' + self.tdid,
    type: 'text',
    value: 0.01,
    disabled: true
  })
  self.ifaceLearningRate.addEventListener('change', function (event) {
    self.ifaceLearningRateValue.value = event.target.value
  })

  // self.ifaceTargetGroup = document.getElementById('targetGroup')
  var panelTrainRowtargetGroup = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainRowtargetGroup, 'label', {
    for: 'targetGroup' + self.tdid,
    title: 'targetGroup',
    innerText: 'Target Group'
  })
  var panelTrainRowtargetGroupForm = pushElement(panelTrainRowtargetGroup, 'div', { class: 'panel-row-form' })
  self.ifaceTargetGroup = pushElement(panelTrainRowtargetGroupForm, 'select', {
    id: 'targetGroup' + self.tdid,
    class: 'form-control input-sm',
    innerHTML: '<option value="input">Input</option><option value="output">Output</option> <option value="selftrain">Self Train</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option><option value="6">6</option> <option value="7">7</option> <option value="8">8</option> <option value="9">9</option> <option value="10">10</option> <option value="selftrain">Self Train</option> <option value="all">All</option>'
  })

  // self.ifaceRouteDirection = document.getElementById('routeDirection')
  var panelTrainrouteDirection = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainrouteDirection, 'label', {
    for: 'routeDirection' + self.tdid,
    title: 'routeDirection',
    innerText: 'Route Direction'
  })
  var panelTrainrouteDirectionForm = pushElement(panelTrainrouteDirection, 'div', { class: 'panel-row-form' })
  self.ifaceRouteDirection = pushElement(panelTrainrouteDirectionForm, 'select', {
    id: 'routeDirection' + self.tdid,
    class: 'form-control input-sm',
    innerHTML: '<option value="from">From</option><option value="to">To</option><option value="both">Both</option>'
  })

  // self.ifaceApplyRandomWeight = document.getElementById('applyRandomWeight')
  var panelTrainApplyRandomWeight = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainApplyRandomWeight, 'label', {
    for: 'applyRandomWeight' + self.tdid,
    title: 'applyRandomWeight',
    innerText: 'Random weight'
  })
  var panelTrainApplyRandomWeightForm = pushElement(panelTrainApplyRandomWeight, 'div', { class: 'panel-row-form' })
  self.ifaceApplyRandomWeight = pushElement(panelTrainApplyRandomWeightForm, 'input', {
    id: 'applyRandomWeight' + self.tdid,
    type: 'button',
    value: 'Distract it'
  })

  // self.ifaceApplyAccelerateWeight = document.getElementById('applyAccelerateWeight')
  var panelTrainApplyAccelerateWeight = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainApplyAccelerateWeight, 'label', {
    for: 'applyAccelerateWeight' + self.tdid,
    title: 'applyAccelerateWeight',
    innerText: 'Accelerate Weight'
  })
  var panelTrainApplyAccelerateWeightForm = pushElement(panelTrainApplyAccelerateWeight, 'div', { class: 'panel-row-form' })
  self.ifaceApplyAccelerateWeight = pushElement(panelTrainApplyAccelerateWeightForm, 'input', {
    id: 'applyAccelerateWeight' + self.tdid,
    type: 'button',
    value: 'Encourage it'
  })

  // self.ifaceProcessState = document.getElementById('processState')
  var panelTrainApplyProcessState = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainApplyProcessState, 'label', {
    for: 'processState' + self.tdid,
    title: 'processState',
    innerText: 'Process State'
  })
  var panelTrainApplyProcessStateForm = pushElement(panelTrainApplyProcessState, 'div', { class: 'panel-row-form' })
  self.ifaceProcessState = pushElement(panelTrainApplyProcessStateForm, 'input', {
    id: 'processState' + self.tdid,
    type: 'checkbox',
    style: 'float:left;'
  })
  panelTrainApplyProcessStateForm.insertAdjacentHTML('beforeend', '<div style="color:#888;display:inline-block;float:left;margin:2px 0 0 6px;"><span>Check to start</span></div>')

  // self.ifaceSaveAsJSON = document.getElementById('saveAsJSON')
  var panelTrainSaveAsJSON = pushElement(panelTrainWrap, 'div', { class: 'panel-row' })
  pushElement(panelTrainSaveAsJSON, 'label', {
    for: 'saveAsJSON' + self.tdid,
    title: 'saveAsJSON',
    innerText: 'Print JSON on Console'
  })
  var panelTrainSaveAsJSONForm = pushElement(panelTrainSaveAsJSON, 'div', { class: 'panel-row-form' })
  self.ifaceSaveAsJSON = pushElement(panelTrainSaveAsJSONForm, 'input', {
    id: 'saveAsJSON' + self.tdid,
    type: 'button',
    value: 'JSON Stringify'
  })

  self.neuronEventBinder = self.neuronEventHandler.bind(self)

  /*
  * Panel Neuron DOM
  */
  self.tabNeuron = pushElement(liNeuronDom, 'input', {
    class: 'Tab-Neuron tab',
    type: 'checkbox',
    checked: false
  })
  var tabNeuronlabel = pushElement(liNeuronDom, 'label', {
    class: 'panel-tab-label',
    innerText: 'Neuron'
  })
  tabNeuronlabel.addEventListener('click', function (e) {
    self.tabNeuron.checked = !self.tabNeuron.checked
  })
  var panelNeuronWrap = pushElement(liNeuronDom, 'div', {
    class: 'panel-content'
  })
  pushElement(panelNeuronWrap, 'h4', { innerText: 'Neuron Config' })

  // self.ifaceNeuronID = document.getElementById('neuronID')
  var panelNeuronID = pushElement(panelNeuronWrap, 'div', { class: 'panel-row' })
  pushElement(panelNeuronID, 'label', {
    for: 'neuronID' + self.tdid,
    title: 'neuronID',
    innerText: 'Neuron ID'
  })
  var panelNeuronIDForm = pushElement(panelNeuronID, 'div', { class: 'panel-row-form' })
  self.ifaceNeuronID = pushElement(panelNeuronIDForm, 'input', {
    id: 'neuronID' + self.tdid,
    type: 'text',
    value: 'id',
    disabled: true
  })

  // self.ifaceNeuronGroup = document.getElementById('neuronGroup')
  var panelNeuronGroup = pushElement(panelNeuronWrap, 'div', { class: 'panel-row' })
  pushElement(panelNeuronGroup, 'label', {
    for: 'neuronGroup' + self.tdid,
    title: 'neuronGroup',
    innerText: 'Neuron Group'
  })
  var panelNeuronGroupForm = pushElement(panelNeuronGroup, 'div', { class: 'panel-row-form' })
  self.ifaceNeuronGroup = pushElement(panelNeuronGroupForm, 'select', {
    id: 'neuronGroup' + self.tdid,
    class: 'form-control input-sm',
    innerHTML: '<option value="input">Input</option><option value="output">Output</option> <option value="selftrain">Self Train</option>' +
      '<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>' +
      '<option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option>'
  })

  // self.ifaceSumOfWeight = document.getElementById('sumOfWeight')
  var panelNeuronSOW = pushElement(panelNeuronWrap, 'div', { class: 'panel-row' })
  pushElement(panelNeuronSOW, 'label', {
    for: 'sumOfWeight' + self.tdid,
    title: 'sumOfWeight',
    innerText: 'Sum Of Weight'
  })
  var panelNeuronSOWForm = pushElement(panelNeuronSOW, 'div', { class: 'panel-row-form' })
  self.ifaceSumOfWeight = pushElement(panelNeuronSOWForm, 'input', {
    id: 'sumOfWeight' + self.tdid,
    type: 'text',
    value: '0',
    disabled: true
  })

  // self.ifaceBias = document.getElementById('bias')
  var panelNeuronBias = pushElement(panelNeuronWrap, 'div', { class: 'panel-row' })
  pushElement(panelNeuronBias, 'label', {
    for: 'bias' + self.tdid,
    title: 'bias',
    innerText: 'Bias'
  })
  var panelNeuronBiasForm = pushElement(panelNeuronBias, 'div', { class: 'panel-row-form' })
  self.ifaceBias = pushElement(panelNeuronBiasForm, 'input', {
    id: 'bias' + self.tdid,
    type: 'text',
    value: '0'
  })

  // self.ifaceActivateMethod = document.getElementById('activateMethod')
  var panelNeuronActivateMethod = pushElement(panelNeuronWrap, 'div', { class: 'panel-row' })
  pushElement(panelNeuronActivateMethod, 'label', {
    for: 'activateMethod' + self.tdid,
    title: 'activateMethod',
    innerText: 'Neuron ID'
  })
  var panelNeuronActivateMethodForm = pushElement(panelNeuronActivateMethod, 'div', { class: 'panel-row-form' })
  self.ifaceActivateMethod = pushElement(panelNeuronActivateMethodForm, 'select', {
    id: 'activateMethod' + self.tdid,
    class: 'form-control input-sm',
    innerHTML: '<option value="identity">identity</option><option value="relu">ReLu</option><option value="sigmoid">Sigmoid</option><option value="thresold">thresold</option>'
  })

  // self.ifaceActivatedValue = document.getElementById('activatedValue')
  var panelNeuronActivatedValue = pushElement(panelNeuronWrap, 'div', { class: 'panel-row' })
  pushElement(panelNeuronActivatedValue, 'label', {
    for: 'activatedValue' + self.tdid,
    title: 'activatedValue',
    innerText: 'Neuron ID'
  })
  var panelNeuronActivatedValueForm = pushElement(panelNeuronActivatedValue, 'div', { class: 'panel-row-form' })
  self.ifaceActivatedValue = pushElement(panelNeuronActivatedValueForm, 'input', {
    id: 'activatedValue' + self.tdid,
    type: 'text',
    value: '0',
    disabled: true
  })

  /*
  * Neuron Routes DOM
  */
  pushElement(panelNeuronWrap, 'h4', { innerText: 'Neuron Routes' })
  self.routeContainer = pushElement(panelNeuronWrap, 'div', { class: 'NeuronRoutes' })

  self.ifaceNeuronGroup.addEventListener('change', self.neuronEventBinder)
  self.ifaceSumOfWeight.addEventListener('change', self.neuronEventBinder)
  self.ifaceBias.addEventListener('keyup', self.neuronEventBinder)
  self.ifaceActivateMethod.addEventListener('change', self.neuronEventBinder)
  self.ifaceActivatedValue.addEventListener('change', self.neuronEventBinder)

  var token = true
  self.mutualExcluse = function (f) {
    if (token) {
      token = false
      try {
        f()
      } catch (e) {
        token = true
        throw new Error(e)
      }
      token = true
    }
  }
}
NeuroPanel.prototype.initPanel = function (env) {
  var self = this

  if (!env) env = 'dynamicout'
  var GameScene = ENV_LIST[env]
  if (!GameScene) return

  self.ifaceInputGame.value = env
  self.gameScene = new GameScene({ width: 170, height: 230, container: self.inputGameDom })
  self.gameSceneLoop = self.gameScene.gameLoop.bind(self.gameScene)
  util.loopProcess.addProcess(self.gameSceneLoop)

  self.ifaceLearningRate.value = self.ifaceLearningRateValue.value = self.neuralNetwork.learningRate
  self.ifaceSaveAsJSON.addEventListener('click', function (e) {
    console.log(JSON.stringify(self.neuralNetwork.saveAsJSON()))
  })
  self.ifaceApplyRandomWeight.addEventListener('click', function (e) {
    self.neuralNetwork.applyRandomWeight(self.ifaceLearningRate.value, self.ifaceTargetGroup.value, self.ifaceRouteDirection.value)
  })
  self.ifaceApplyAccelerateWeight.addEventListener('click', function (e) {
    self.neuralNetwork.applyAccelerateWeight(self.ifaceLearningRate.value, self.ifaceTargetGroup.value, self.ifaceRouteDirection.value)
  })

  self.ifaceInputGame.addEventListener('click', function (e) {
    var GameScene = ENV_LIST[self.ifaceInputGame.value]
    if (!GameScene) return

    if (self.gameSceneLoop) {
      util.loopProcess.removeProcess(self.gameSceneLoop)
      if (self.gameScene.destroy) self.gameScene.destroy()
      // TODO: game destroy 만들기
      self.inputGameDom.removeChild(self.gameScene.renderer.view)
    }
    self.gameScene = new GameScene({ width: 170, height: 230, container: self.inputGameDom })
    self.gameSceneLoop = self.gameScene.gameLoop.bind(self.gameScene)
    util.loopProcess.addProcess(self.gameSceneLoop)
  })
  self.nturn = 0
  function nnloop (delta) {
    var self = this
    self.nturn = (self.nturn + 1) % 12 // frame skip
    if (self.nturn === 0) {
      var inputdata = self.gameScene.getEnvironmentData()
      var outputdata = self.neuralNetwork.getOutput()
      self.neuralNetwork.process(inputdata)
      self.gameScene.pushAction(outputdata)
      self.neuralNetwork.selfTraining(self.ifaceLearningRate.value)
    }
  }
  self.nnloop = nnloop.bind(self)
  self.ifaceProcessState.addEventListener('click', function (e) {
    // set main loop method
    if (e.target.checked) util.loopProcess.addProcess(self.nnloop)
    else util.loopProcess.removeProcess(self.nnloop)
  })
}

NeuroPanel.prototype.selectNeuron = function (nodeID) {
  var self = this
  self.selectedNeuron = self.neuralNetwork.getNode(nodeID)
  if (!self.selectedNeuron) return
  // init neuron section
  self.tabNeuron.checked = true

  if (!self.selectedNeuron.group) self.selectedNeuron.group = 0
  if (!self.selectedNeuron.sumofw) self.selectedNeuron.sumofw = 0
  if (!self.selectedNeuron.bias) self.selectedNeuron.bias = 0
  if (!self.selectedNeuron.actMethod) self.selectedNeuron.actMethod = 'identity'
  if (!self.selectedNeuron.actvalue) self.selectedNeuron.actvalue = 0

  self.ifaceNeuronID.value = self.selectedNeuron.id
  self.ifaceNeuronGroup.value = self.selectedNeuron.group
  self.ifaceSumOfWeight.value = self.selectedNeuron.sumofw
  self.ifaceBias.value = self.selectedNeuron.bias
  self.ifaceActivateMethod.value = self.selectedNeuron.actMethod
  self.ifaceActivatedValue.value = self.selectedNeuron.actvalue

  while (self.routeContainer.firstChild) {
    self.routeContainer.removeChild(self.routeContainer.firstChild)
  }
  self.neuralNetwork.neuronData.links.forEach(function (link) {
    if (link.target === self.selectedNeuron.id) {
      self.createRouteRow(link, 'from')
    }
  })
  if (self.routeContainer.firstChild) {
    var rowdivider = document.createElement('div')
    rowdivider.className = 'panel-row divider'
    self.routeContainer.appendChild(rowdivider)
  }
  self.neuralNetwork.neuronData.links.forEach(function (link) {
    if (link.source === self.selectedNeuron.id) {
      self.createRouteRow(link, 'to')
    }
  })
}

NeuroPanel.prototype.createRouteRow = function (link, direction) {
  var self = this

  var dest = ((direction === 'from') ? link.source : link.target)

  var row = document.createElement('div')
  row.className = 'panel-row'
  self.routeContainer.appendChild(row)

  var label = document.createElement('label')
  label.setAttribute('for', 'route-' + link.source + '-' + link.target)
  label.setAttribute('title', 'route-' + link.source + '-' + link.target)
  label.innerText = 'Weight ' + direction + ' '// + dest
  row.appendChild(label)

  var formcon = document.createElement('div')
  formcon.className = 'panel-row-form'
  row.appendChild(formcon)

  var inputnid = document.createElement('input')
  inputnid.setAttribute('type', 'text')
  inputnid.setAttribute('value', dest)
  inputnid.setAttribute('disabled', 'true')
  inputnid.id = 'route-' + link.source + '-' + link.target + direction
  formcon.appendChild(inputnid)

  var inputrange = document.createElement('input')
  inputrange.setAttribute('type', 'range')
  inputrange.setAttribute('min', '-2')
  inputrange.setAttribute('max', '2')
  inputrange.setAttribute('step', '0.001')
  inputrange.setAttribute('value', link.value)
  inputrange.id = 'route-' + link.source + '-' + link.target
  formcon.appendChild(inputrange)
  inputrange.addEventListener('change', self.routeEventHandler.bind(self))

  var inputval = document.createElement('input')
  inputval.setAttribute('type', 'text')
  inputval.setAttribute('value', link.value)
  inputval.setAttribute('disabled', 'true')
  inputval.id = 'route-' + link.source + '-' + link.target + 'value'
  formcon.appendChild(inputval)

  inputrange.addEventListener('change', function (event) {
    inputval.value = event.target.value
  })
}

NeuroPanel.prototype.neuronEventHandler = function (event) {
  var self = this
  if (!self.selectedNeuron) return
  self.mutualExcluse(function () {
    var outputObj = { id: self.selectedNeuron.id }
    console.log('neuronEventHandler: ' + DOMID_TO_NODE[String(event.target.id).replace(self.tdid, '')])
    outputObj[DOMID_TO_NODE[String(event.target.id).replace(self.tdid, '')]] = event.target.value
    self.neuralNetwork.updateNode(outputObj, true)
  })
}
NeuroPanel.prototype.routeEventHandler = function (event) {
  var self = this
  if (!self.selectedNeuron) return
  self.mutualExcluse(function () {
    var temArr = event.target.id.split('-')
    var selectedlink = self.neuralNetwork.getLink(temArr[1], temArr[2])
    if (selectedlink) {
      var outputObj = {
        source: temArr[1],
        target: temArr[2],
        delta: event.target.value - selectedlink.value,
        value: event.target.value
      }
      self.neuralNetwork.updateLink(outputObj, true)
    }
  })
}

NeuroPanel.prototype.releaseNeuron = function () {
  var self = this
  self.tabNeuron.checked = false
  while (self.routeContainer.firstChild) {
    self.routeContainer.removeChild(self.routeContainer.firstChild)
  }
  self.selectedNeuron = null
}

NeuroPanel.prototype.recieveNodeChange = function (data) {
  var self = this
  self.mutualExcluse(function () {
    if (!self.selectedNeuron) return
    if (data.type === 'delete') {
      if (self.selectedNeuron.id === data.value.id) {
        self.releaseNeuron()
      }
    } else if (data.type === 'update') {
      if (self.selectedNeuron.id === data.value.id) {
        if (data.value.group) self.ifaceNeuronGroup.value = data.value.group
        if (data.value.bias) self.ifaceBias.value = data.value.bias
        if (data.value.actMethod) self.ifaceActivateMethod.value = data.value.actMethod
        if (data.value.sumofw) self.ifaceSumOfeight.value = data.value.sumofw
        if (data.value.actvalue) self.ifaceActivatedValue.value = data.value.actvalue
      }
    }
  })
}
NeuroPanel.prototype.recieveLinkChange = function (data) {
  var self = this
  self.mutualExcluse(function () {
    if (data.type === 'delete') {
      var inputnidfrom = document.getElementById('route-' + data.value.source + '-' + data.value.target + 'from')
      if (inputnidfrom) {
        inputnidfrom.parentElement.parentElement.parentElement.removeChild(inputnidfrom.parentElement.parentElement)
      }
    } else if (data.type === 'update') {
      console.log('tracking recieveNodeChange: ' + JSON.stringify(data))
      var inputrange = document.getElementById('route-' + data.value.source + '-' + data.value.target)
      var inputval = document.getElementById('route-' + data.value.source + '-' + data.value.target + 'value')
      if (inputrange && data.value.value) inputrange.value = data.value.value
      if (inputval && data.value.value) inputval.value = data.value.value
    }
  })
}

NeuroPanel.prototype.close = function () {
  var self = this
  self.ifaceNeuronGroup.removeEventListener('change', self.neuronEventBinder)
  self.ifaceSumOfWeight.removeEventListener('change', self.neuronEventBinder)
  self.ifaceBias.removeEventListener('keyup', self.neuronEventBinder)
  self.ifaceActivateMethod.removeEventListener('change', self.neuronEventBinder)
  self.ifaceActivatedValue.removeEventListener('change', self.neuronEventBinder)
}

function pushElement (parentElement, tagName, options) {
  var element = document.createElement(tagName)
  if (options) {
    if (options.id) element.id = options.id
    if (options.class) element.className = options.class
    if (options.type) element.type = options.type
    if (options.value) element.value = options.value

    if (options.checked) element.checked = options.checked
    if (options.innerHTML) element.innerHTML = options.innerHTML
    if (options.innerText) element.innerText = options.innerText
    if (options.title) element.setAttribute('title', options.title)
    if (options.disabled) element.setAttribute('disabled', options.disabled)
    if (options.min) element.setAttribute('min', options.min)
    if (options.max) element.setAttribute('max', options.max)
    if (options.step) element.setAttribute('step', options.step)
    if (options.style) element.setAttribute('style', options.style)
  }
  parentElement.appendChild(element)
  return element
}

module.exports = NeuroPanel
