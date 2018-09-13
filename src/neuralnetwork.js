var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
inherits(NeuralNetwork, EventEmitter)

var ACTIVATE_METHOD = {
  sigmoid: 'sigmoid',
  relu: 'relu',
  thresold: 'thresold',
  identity: 'identity'
}
var TO = '->'
// -------------------------------------------------
// Neural Network
// -------------------------------------------------
function NeuralNetwork (options) {
  var self = this
  if (!(self instanceof NeuralNetwork)) return new NeuralNetwork(options)
  self.learningRate = options.learningRate || 0.01
  self.contentID = options.contentID
  self.neuronData = { nodes: [], links: [] } // for storing yjs data array
  self.neuron = {} // for binding yjs data array to object -> better finding performence
  self.route = {}
  // if (!options.data) { // sample data
  //   self.addNode({ id: '1', group: 'input', x: 100, y: 100, sumofw: 0, bias: 0, actMethod: ACTIVATE_METHOD.identity, actvalue: 0 })
  //   self.addNode({ id: '2', group: 'input', x: 150, y: 150, sumofw: 0, bias: 0, actMethod: ACTIVATE_METHOD.identity, actvalue: 0 })
  //   self.addLink({ source: '1', target: '2', value: 1, delta: 0 })
  // }
  self.outputs = []
  self.selfTrains = []
}

NeuralNetwork.prototype.getNode = function (nodeid) {
  var self = this
  return self.neuron[nodeid]
}
NeuralNetwork.prototype.getLink = function (source, target) {
  var self = this
  return self.route[source + TO + target]
}

NeuralNetwork.prototype.setNodes = function (data) {
  var self = this
  self.neuronData.nodes = data
  self.neuronData.nodes.forEach(function (node) {
    self.neuron[node.id] = node
  })
}
NeuralNetwork.prototype.setLinks = function (data) {
  var self = this
  self.neuronData.links = data
  self.neuronData.links.forEach(function (link) {
    self.route[link.source + TO + link.target] = link
  })
}

NeuralNetwork.prototype.addNode = function (data, needSync) {
  var self = this
  // var isExist = self.neuronData.nodes.find(function (node) { return data.id === node.id })
  var isExist = self.getNode(data.id)
  if (isExist) return false

  if (!data.id) data.id = Math.random().toString(36).substr(2)
  if (!data.group) data.group = '0'
  if (!data.x) data.x = 0
  if (!data.y) data.y = 0
  if (!data.bias) data.bias = 0
  if (!data.actMethod) data.actMethod = ACTIVATE_METHOD.identity
  // actvalue와 sumofw는 sync하지 않는다.
  data.sumofw = 0
  data.actvalue = 0
  self.neuronData.nodes.push(data)
  self.neuron[data.id] = data

  if (needSync) {
    self.emit('changeNode', {
      type: 'insert',
      contentID: self.contentID,
      value: data
    })
  }
  return self.neuron[data.id]
}

NeuralNetwork.prototype.updateNode = function (data, needSync) {
  var self = this
  var node = self.getNode(data.id)
  if (!node) return
  if (data.group) node.group = data.group
  if (data.bias) node.bias = data.bias
  if (data.actMethod) node.actMethod = data.actMethod
  if (data.x) node.x = data.x
  if (data.y) node.y = data.y

  if (needSync) {
    self.emit('changeNode', {
      type: 'update',
      contentID: self.contentID,
      value: data
    })
  }
}
NeuralNetwork.prototype.deleteNode = function (data, needSync) {
  var self = this
  var isExist = self.getNode(data.id)
  if (!isExist) return
  self.neuronData.nodes.splice(self.neuronData.nodes.indexOf(isExist), 1)
  delete self.neuron[data.id]
  if (needSync) {
    self.emit('changeNode', {
      type: 'delete',
      contentID: self.contentID,
      value: data
    })
    console.log('remove test 4')
  }
}

NeuralNetwork.prototype.addLink = function (data, needSync) {
  var self = this
  // var isExist = self.neuronData.links.find(function (link) { return data.source === link.source && data.target === link.target })
  var isExist = self.getLink(data.source, data.target)
  if (isExist) return false
  if (!self.getNode(data.source) || !self.getNode(data.target)) return false

  if (!data.value) data.value = 0
  if (!data.delta) data.delta = 0
  self.neuronData.links.push(data)
  self.route[data.source + TO + data.target] = data
  if (needSync) {
    self.emit('changeLink', {
      type: 'insert',
      contentID: self.contentID,
      value: data
    })
  }
  return true
}
NeuralNetwork.prototype.updateLink = function (data, needSync) {
  var self = this
  var link = self.getLink(data.source, data.target)
  if (!link) return
  if (data.value) link.value = data.value
  if (data.delta) link.delta = data.delta
  // console.log('track update link: ' + JSON.stringify(data))
  if (needSync) {
    self.emit('changeLink', {
      type: 'update',
      contentID: self.contentID,
      value: data
    })
  }
}
NeuralNetwork.prototype.deleteLink = function (data, needSync) {
  var self = this
  var isExist = self.getLink(data.source, data.target)
  if (!isExist) return
  // self.neuronData.links.splice(self.neuronData.links.indexOf(isExist), 1)
  self.neuronData.links.splice(self.neuronData.links.indexOf(isExist), 1)
  delete self.route[data.source + TO + data.target]
  if (needSync) {
    self.emit('changeLink', {
      type: 'delete',
      contentID: self.contentID,
      value: data
    })
  }
}

NeuralNetwork.prototype.process = function (inputData) {
  var self = this
  if (!Array.isArray(inputData)) return console.warn('NeuralNetwork: cannot process non-array data!')
  self.outputs = []
  self.selfTrains = []
  var inputIndex = 0
  for (var i = 0; i < self.neuronData.nodes.length; i++) {
    if (self.neuronData.nodes[i].group === 'input') {
      self.neuronData.nodes[i].actvalue = inputData[inputIndex]
      inputIndex++
    } else {
      if (self.neuronData.nodes[i].group === 'output') {
        self.outputs.push(self.neuronData.nodes[i])
      } else if (self.neuronData.nodes[i].group === 'selftrain') {
        self.selfTrains.push(self.neuronData.nodes[i])
      }
      self.neuronData.nodes[i].actvalue = self.activate(self.neuronData.nodes[i].sumofw, self.neuronData.nodes[i].actMethod)
    }
    self.neuronData.nodes[i].sumofw = 0
  }
  for (var j = 0; j < self.neuronData.links.length; j++) {
    self.neuron[self.neuronData.links[j].target].sumofw += self.neuron[self.neuronData.links[j].source].actvalue * self.neuronData.links[j].value
  }
  // 기존의 방식이 반복문을 이중으로 돌려서 자원 소모가 많아서 처리방식을 단순하게 고쳐보았다.
  // 장점: 처리가 더 빠르다.
  // 단점: 기존의 퍼셉트론 방식은 인풋과 같은 턴에 아웃풋이 나왔는데 이 방식으로 하면 거치는 레이어 수만큼 아웃풋 턴이 밀린다.
  // 그러나 이 방식이 인간의 뉴런 동작방식과 더 유사한 점도 있다.

  // var inputIndex = 0
  // for (var i = 0; i < self.neuronData.nodes.length; i++) {
  //   if (self.neuronData.nodes[i].group === 'input') {
  //     // console.log('hey ' + self.neuronData.nodes[i].id + ' ' + inputData[inputIndex])
  //     self.neuronData.nodes[i].actvalue = inputData[inputIndex]
  //     inputIndex++
  //   } else {
  //     var sumofw = 0
  //     for (var j = 0; j < self.neuronData.links.length; j++) {
  //       if (self.neuronData.links[j].target === self.neuronData.nodes[i].id) {
  //         var source = self.neuronData.nodes.find(function (cv) { return cv.id === self.neuronData.links[j].source })
  //         sumofw += source.actvalue * self.neuronData.links[j].value
  //       }
  //     }
  //     self.neuronData.nodes[i].sumofw = sumofw + Number(self.neuronData.nodes[i].bias)
  //     self.neuronData.nodes[i].actvalue = self.activate(self.neuronData.nodes[i].sumofw, self.neuronData.nodes[i].actMethod)
  //   }
  // }
}

NeuralNetwork.prototype.getOutput = function () {
  var self = this
  // for (var i = 0; i < self.neuronData.nodes.length; i++) {
  //   if (self.neuronData.nodes[i].group === 'output') {
  //     outputArray.push(self.neuronData.nodes[i].actvalue)
  //   }
  // }
  return self.outputs.map(function (value) {
    return value.actvalue
  })
}

NeuralNetwork.prototype.getSelfTrain = function () {
  var self = this
  return self.selfTrains.map(function (value) {
    return value.actvalue
  })
}

NeuralNetwork.prototype.activate = function (val, methodName) {
  methodName = !methodName ? ACTIVATE_METHOD.identity : methodName
  switch (methodName) {
    case ACTIVATE_METHOD.sigmoid:
      return 1 / (1 + Math.exp(-val))
    case ACTIVATE_METHOD.relu:
      return Math.max(0, val)
    case ACTIVATE_METHOD.thresold:
      if (val > 0) return 1.0
      else return 0.0
    case ACTIVATE_METHOD.identity:
    default:
      return val
  }
}
NeuralNetwork.prototype.act_grad = function (val, methodName) {
  methodName = !methodName ? ACTIVATE_METHOD.identity : methodName
  switch (methodName) {
    case ACTIVATE_METHOD.sigmoid:
      return (1.0 - val) * val
    case ACTIVATE_METHOD.relu:
      return (val > 0) ? 1.0 : 0.0
    case ACTIVATE_METHOD.thresold:
      return (val > 0) ? 1.0 : 0.0
    case ACTIVATE_METHOD.identity:
    default:
      return 1.0
  }
}

NeuralNetwork.prototype.importAsJSON = function (importData) {
  var self = this
  if (!importData.nodes || !importData.links) return

  importData.nodes.forEach(function (node) {
    var isExist = self.getNode(node.id)
    if (isExist) self.updateNode(node, true)
    else self.addNode(node, true)
  })
  importData.links.forEach(function (link) {
    var isExist = self.getLink(link.source, link.target)
    if (isExist) self.updateLink(link, true)
    else self.addLink(link, true)
  })
}

NeuralNetwork.prototype.saveAsJSON = function () {
  var self = this
  var outputNeurons = []
  var outputRoutes = []

  self.neuronData.nodes.forEach(function (node) {
    outputNeurons.push({
      id: node.id,
      group: node.group,
      x: node.x,
      y: node.y,
      bias: node.bias,
      sumofw: node.sumofw,
      actMethod: node.actMethod,
      actvalue: node.actvalue
    })
  })
  self.neuronData.links.forEach(function (link) {
    outputRoutes.push({
      source: link.source,
      target: link.target,
      value: link.value
    })
  })

  return {
    nodes: outputNeurons,
    links: outputRoutes
  }
}

NeuralNetwork.prototype.applyRandomWeight = function (learningRate, targetGroup, direction, mutation) {
  var self = this
  learningRate = learningRate || self.learningRate
  targetGroup = targetGroup || 'all'
  direction = direction || 'both'
  // console.log('random weight ', learningRate, ' ', targetGroup, ' ', direction)
  if (targetGroup === 'all') {
    for (var k = 0; k < self.neuronData.links.length; k++) {
      if (mutation && (Math.floor(Math.random() * 100 * mutation))) break
      self.updateLink({
        source: self.neuronData.links[k].source,
        target: self.neuronData.links[k].target,
        value: Number(self.neuronData.links[k].value) + self.neuronData.links[k].delta,
        delta: (Math.random() * 4 - 2) * Number(learningRate)
      }, true)
      // self.neuronData.links[k].delta = (Math.random() * 4 - 2) * Number(learningRate)
      // self.neuronData.links[k].value = Number(self.neuronData.links[k].value) + self.neuronData.links[k].delta
    }
    return
  }

  for (var i = 0; i < self.neuronData.nodes.length; i++) {
    if (self.neuronData.nodes[i].group === targetGroup || self.neuronData.nodes[i].group === Number(targetGroup)) {
      for (var j = 0; j < self.neuronData.links.length; j++) {
        if ((direction === 'from' || direction === 'both') && self.neuronData.links[j].target === self.neuronData.nodes[i].id) {
          // direction이 from 인데 link.target을 쓰는 이유: 사용자는 뉴런을 선택한 관점에서 from에 해당하는 통로 가중치를 조정하길 원한다.
          // links.target은 통로의 관점에서 보기 때문에 통로가 바라보는 뉴런이 일치하는지 확인해야 한다.
          self.updateLink({
            source: self.neuronData.links[j].source,
            target: self.neuronData.links[j].target,
            value: Number(self.neuronData.links[j].value) + self.neuronData.links[j].delta,
            delta: (Math.random() * 4 - 2) * Number(learningRate)
          }, true)
        } else if ((direction === 'to' || direction === 'both') && self.neuronData.links[j].source === self.neuronData.nodes[i].id) {
          self.updateLink({
            source: self.neuronData.links[j].source,
            target: self.neuronData.links[j].target,
            value: Number(self.neuronData.links[j].value) + self.neuronData.links[j].delta,
            delta: (Math.random() * 4 - 2) * Number(learningRate)
          }, true)
        }
      }
    }
  }
}

NeuralNetwork.prototype.applyAccelerateWeight = function (learningRate, targetGroup, direction) {
  var self = this
  // console.log('Accelerate weight ', learningRate, ' ', targetGroup, ' ', direction)
  if (targetGroup === 'all') {
    for (var k = 0; k < self.neuronData.links.length; k++) {
      self.updateLink({
        source: self.neuronData.links[k].source,
        target: self.neuronData.links[k].target,
        value: Number(self.neuronData.links[k].value) + self.neuronData.links[k].delta,
        delta: self.neuronData.links[k].delta * Number(learningRate)
      }, true)
    }
    return
  }

  for (var i = 0; i < self.neuronData.nodes.length; i++) {
    if (self.neuronData.nodes[i].group === targetGroup || self.neuronData.nodes[i].group === Number(targetGroup)) {
      for (var j = 0; j < self.neuronData.links.length; j++) {
        if ((direction === 'from' || direction === 'both') && self.neuronData.links[j].target === self.neuronData.nodes[i].id) {
          // direction이 from 인데 link.target을 쓰는 이유: 사용자는 뉴런을 선택한 관점에서 from에 해당하는 통로 가중치를 조정하길 원한다.
          // links.target은 통로의 관점에서 보기 때문에 통로가 바라보는 뉴런이 일치하는지 확인해야 한다.
          self.updateLink({
            source: self.neuronData.links[j].source,
            target: self.neuronData.links[j].target,
            value: Number(self.neuronData.links[j].value) + self.neuronData.links[j].delta,
            delta: self.neuronData.links[j].delta * Number(learningRate)
          }, true)
        } else if ((direction === 'to' || direction === 'both') && self.neuronData.links[j].source === self.neuronData.nodes[i].id) {
          self.updateLink({
            source: self.neuronData.links[j].source,
            target: self.neuronData.links[j].target,
            value: Number(self.neuronData.links[j].value) + self.neuronData.links[j].delta,
            delta: self.neuronData.links[j].delta * Number(learningRate)
          }, true)
        }
      }
    }
  }
}

NeuralNetwork.prototype.selfTraining = function (learningRate) {
  var self = this
  var traindata = self.getSelfTrain()
  // console.log('self train attempt: ' + traindata[0])
  if (!traindata.length) return
  if (traindata[0]) {
    self.applyAccelerateWeight(learningRate, 'all')
  } else {
    self.applyRandomWeight(learningRate, 'all')
  }
}

NeuralNetwork.prototype.createNeuronCorps = function (offsetX, offsetY, sizeX, sizeY, options) {
  var self = this

  for (var i = 0; i < sizeY; i++) {
    for (var j = 0; j < sizeX; j++) {
      var obj = JSON.parse(JSON.stringify(options))
      obj.x = offsetX + j * 35
      obj.y = offsetY + i * 35
      self.addNode(obj, true)
    }
  }
}

NeuralNetwork.prototype.createConnectionsFull = function (sourceGroup, targetGroup, fixedValue) {
  var self = this

  for (var i = 0; i < self.neuronData.nodes.length; i++) {
    if (new String(self.neuronData.nodes[i].group).valueOf() == new String(sourceGroup).valueOf()) {
      for (var j = 0; j < self.neuronData.nodes.length; j++) {
        if (new String(self.neuronData.nodes[j].group).valueOf() == new String(targetGroup).valueOf()) {
          self.addLink({
            source: self.neuronData.nodes[i].id,
            target: self.neuronData.nodes[j].id,
            value: fixedValue || (Math.random() * 6 - 3)
          }, true)
        }
      }
    }
  }
}

NeuralNetwork.prototype.createConnectionsCNN = function (sourceGroup, targetGroup, sizeX, sizeY, kernel) {
  var self = this
  var usePadding = true
  var currentX = 0
  var currentY = 0
  var tempSourceNodes = []
  var tempTargetNodes = []

  if (!kernel) {
    kernel = {
      lt: 1,
      t: 0,
      rt: 1,
      l: 0,
      c: 1,
      r: 0,
      lb: 1,
      b: 0,
      rb: 1
    }
  }
  var topPads = []
  var bottomPads = []
  var leftPads = []
  var rightPads = []
  var vertaxPads = [] // (left top), (right top), (left bottom), (right bottom)

  tempSourceNodes.push([])
  for (var i = 0; i < self.neuronData.nodes.length; i++) {
    if (new String(self.neuronData.nodes[i].group).valueOf() == new String(sourceGroup).valueOf()) {
      tempSourceNodes[currentY].push(self.neuronData.nodes[i])
      currentX++
      if (currentX === sizeX) {
        currentX = 0
        tempSourceNodes.push([])
        currentY++
      }
    }
  }
  currentX = 0
  currentY = 0
  tempTargetNodes.push([])
  for (var j = 0; j < self.neuronData.nodes.length; j++) {
    if (new String(self.neuronData.nodes[j].group).valueOf() == new String(targetGroup).valueOf()) {
      tempTargetNodes[currentY].push(self.neuronData.nodes[j])
      currentX++
      if (currentX === sizeX) {
        currentX = 0
        tempTargetNodes.push([])
        currentY++
      }
    }
  }

  if (tempSourceNodes.length !== tempTargetNodes.length) {
    console.log('Error: different shape between groups.')
    return
  }

  if (usePadding) {
    for (i = 0; i < sizeY; i++) {
      leftPads.push(self.addNode({ x: tempSourceNodes[i][0].x - 30, y: tempSourceNodes[i][0].y, group: 10 }, true))
      rightPads.push(self.addNode({ x: tempSourceNodes[i][sizeX - 1].x + 30, y: tempSourceNodes[i][sizeX - 1].y, group: 10 }, true))
    }
    for (j = 0; j < sizeX; j++) {
      topPads.push(self.addNode({ x: tempSourceNodes[0][j].x, y: tempSourceNodes[0][j].y - 30, group: 10 }, true))
      bottomPads.push(self.addNode({ x: tempSourceNodes[sizeY - 1][j].x, y: tempSourceNodes[sizeY - 1][j].y + 30, group: 10 }, true))
    }

    vertaxPads.push(self.addNode({ x: tempSourceNodes[0][0].x - 30, y: tempSourceNodes[0][0].y - 30, group: 10 }, true))
    vertaxPads.push(self.addNode({ x: tempSourceNodes[0][sizeX - 1].x + 30, y: tempSourceNodes[0][sizeX - 1].y - 30, group: 10 }, true))
    vertaxPads.push(self.addNode({ x: tempSourceNodes[sizeY - 1][0].x - 30, y: tempSourceNodes[sizeY - 1][0].y + 30, group: 10 }, true))
    vertaxPads.push(self.addNode({ x: tempSourceNodes[sizeY - 1][sizeX - 1].x + 30, y: tempSourceNodes[sizeY - 1][sizeX - 1].y + 30, group: 10 }, true))
  }

  for (var l = 0; l < tempTargetNodes.length; l++) {
    for (var k = 0; k < tempTargetNodes[l].length; k++) {
      self.addLink({ source: tempSourceNodes[l][k].id, target: tempTargetNodes[l][k].id, value: kernel.c }, true)

      if ((l - 1) < 0 && (k - 1) < 0 && usePadding) { // left top padding
        self.addLink({ source: vertaxPads[0].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: leftPads[l].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: leftPads[l + 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: topPads[k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: topPads[k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: tempSourceNodes[l][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((l + 1) >= sizeY && (k - 1) < 0 && usePadding) { // left bottom padding
        self.addLink({ source: leftPads[l - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: leftPads[l].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: vertaxPads[2].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: bottomPads[k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: tempSourceNodes[l][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: bottomPads[k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((l - 1) < 0 && (k + 1) >= sizeX && usePadding) { // right top padding
        self.addLink({ source: topPads[k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: tempSourceNodes[l][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: topPads[k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: vertaxPads[1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: rightPads[l].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: rightPads[l + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((l + 1) >= sizeY && (k + 1) >= sizeX && usePadding) { // right bottom padding
        self.addLink({ source: tempSourceNodes[l - 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: tempSourceNodes[l][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: bottomPads[k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: bottomPads[k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: rightPads[l - 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: rightPads[l].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: vertaxPads[3].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((k - 1) < 0 && usePadding) { // left padding
        self.addLink({ source: leftPads[l - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: leftPads[l].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: leftPads[l + 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: tempSourceNodes[l][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((k + 1) >= sizeX && usePadding) { // right padding
        self.addLink({ source: tempSourceNodes[l - 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: tempSourceNodes[l][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: rightPads[l - 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: rightPads[l].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: rightPads[l + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((l - 1) < 0 && usePadding) { // top padding
        self.addLink({ source: topPads[k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: tempSourceNodes[l][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: topPads[k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: topPads[k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: tempSourceNodes[l][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else if ((l + 1) >= sizeY && usePadding) { // bottom padding
        self.addLink({ source: tempSourceNodes[l - 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: tempSourceNodes[l][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: bottomPads[k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: bottomPads[k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: tempSourceNodes[l][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: bottomPads[k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      } else { // center
        self.addLink({ source: tempSourceNodes[l - 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lt }, true)
        self.addLink({ source: tempSourceNodes[l][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.l }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k - 1].id, target: tempTargetNodes[l][k].id, value: kernel.lb }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.t }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k].id, target: tempTargetNodes[l][k].id, value: kernel.b }, true)
        self.addLink({ source: tempSourceNodes[l - 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rt }, true)
        self.addLink({ source: tempSourceNodes[l][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.r }, true)
        self.addLink({ source: tempSourceNodes[l + 1][k + 1].id, target: tempTargetNodes[l][k].id, value: kernel.rb }, true)
      }
    }
  }
}

NeuralNetwork.prototype.crossover = function (importData) { // json gene data
  var self = this
  if (!importData.nodes || !importData.links) return null
  var outputGene = {
    nodes: [],
    links: []
  }

  importData.nodes.forEach(function (node) {
    var mNode = self.getNode(node.id)
    if (mNode) {
      if (Math.floor(Math.random() * 2)) {
        outputGene.nodes.push({
          id: mNode.id,
          group: mNode.group,
          x: mNode.x,
          y: mNode.y,
          bias: mNode.bias,
          sumofw: mNode.sumofw,
          actMethod: mNode.actMethod,
          actvalue: mNode.actvalue
        })
      } else {
        outputGene.nodes.push({
          id: node.id,
          group: node.group,
          x: node.x,
          y: node.y,
          bias: node.bias,
          sumofw: node.sumofw,
          actMethod: node.actMethod,
          actvalue: node.actvalue
        })
      }
    }
  })
  importData.links.forEach(function (link) {
    var mLink = self.getLink(link.source, link.target)
    if (mLink) {
      if (Math.floor(Math.random() * 2)) {
        outputGene.links.push({
          source: mLink.source,
          target: mLink.target,
          value: mLink.value
        })
      } else {
        outputGene.links.push({
          source: link.source,
          target: link.target,
          value: link.value
        })
      }
    }
  })

  return outputGene
}

NeuralNetwork.prototype.mutate = function (mutateRate) {
  var self = this
  for (var k = 0; k < self.neuronData.links.length; k++) {
    self.updateLink({
      source: self.neuronData.links[k].source,
      target: self.neuronData.links[k].target,
      value: Number(self.neuronData.links[k].value) + (Math.random() * 4 - 2) * Number(mutateRate),
      delta: 0
    }, true)
  }
}

module.exports = NeuralNetwork
