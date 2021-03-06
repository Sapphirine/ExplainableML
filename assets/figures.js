/*
Configurations and utility functions for figures
*/
if(typeof require != "undefined") {
 // hack for loading from generator
 var d3 = require('./d3.min.js')
 var visualize = require('./visualize.js').visualize
 var tsnejs = require('./tsne.js')
 var demoConfigs = require('./demo-configs.js')
 var distanceMatrix = demoConfigs.distanceMatrix
 var Point = demoConfigs.Point
}

var FIGURES = {
  width: 150,
  height: 150,
  downscaleWidth: 300,
  downscaleHeight: 300,
}

function getPoints(demo, params) {
  if(!params) {
    params = [demo.options[0].start]
    if(demo.options[1]) params.push(demo.options[1].start)
  }
  var points = demo.generator.apply(null, params);
  return points;
}
function renderDemoInitial(demo, params, canvas, canvasD3) {
  visualize(points, canvas, canvasD3, null, null)
}


/*
var demoTimescale = d3.scaleLinear()
  .domain([0, 200, 6000])
  .range([20, 10, 0])
*/
var timescale = d3.scaleLinear()
  .domain([0, 20, 50, 100, 200, 6000])
  .range([60, 30, 20, 10, 0]);

function demoMaker(points, canvas, canvasD3, options) {
  var demo = {};
  visualize(points, canvas, canvasD3, "", true, false);
  return demo;
}
	/*, stepCb) {
  var demo = {};
  var paused = false;
  var step = 0;
  var chunk = 1;
  var frameId;

  var tsne = new tsnejs.tSNE(options);
  var dists = distanceMatrix(points);
  tsne.initDataDist(dists);

  function iterate() {
    if(paused) return;

    // control speed at which we iterate
    if(step >= 200) chunk = 10;
    for(var k = 0; k < chunk; k++) {
      tsne.step();
      ++step;
    }

    //inform the caller about the current step
    stepCb(step)

    // update the solution and render
    var solution = tsne.getSolution().map(function(coords, i) {
      return new Point(coords, points[i].color);
    });
    visualize(solution, canvas, ""); //removed message

    //control the loop.
    var timeout = timescale(step)
    setTimeout(function() {
      frameId = window.requestAnimationFrame(iterate);
    }, timeout)
  }

  demo.pause = function() {
    if(paused) return; // already paused
    paused = true;
    window.cancelAnimationFrame(frameId)
  }
  demo.unpause = function() {
    if(!paused) return; // already unpaused
    paused = false;
    iterate();
	visualize(points, canvas, "", false);
  }
  demo.paused = function() {
    return paused;
  }
  demo.destroy = function() {
    demo.pause();
    delete demo;
  }
  iterate();
  
  return demo;
}*/

function runDemoSync(points, canvas, canvasD3, options, stepLimit, no3d) {
  var tsne = new tsnejs.tSNE(options);
  var dists = distanceMatrix(points);
  tsne.initDataDist(dists);
  var step = 0;
  for(var k = 0; k < stepLimit; k++) {
    if(k % 100 === 0) console.log("step", step)
    tsne.step();
    ++step;
  }
  var solution = tsne.getSolution().map(function(coords, i) {
    return new Point(coords, points[i].color);
  });
  visualize(solution, canvas, canvasD3, "", no3d); //removed message
  return step;
}

if(typeof module != "undefined") module.exports = {
  demoMaker: demoMaker,
  runDemoSync: runDemoSync,
  getPoints: getPoints,
  FIGURES: FIGURES
}
