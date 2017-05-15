/**
 * @fileoverview Demo that helps explain what t-SNE is doing.
 * In particular, shows how various geometries translate to a 2D map,
 * and lets you play with the perplexity hyperparameter.
 *
 * None of this is optimized code, because it doesn't seem necessary
 * for the small cases we're considering.
 */


// Global variable for whether we should keep optimizing.
var playgroundThread = 0;
var GLOBALS = {
  playgroundDemo: null, // the object to control running the playground simulation
  trayDemo: null, // the object to control running the tray simulation
  running: true,
  unpausedBefore: false,
  stepLimit: 5000,
  state: {},
  predict: {},
  showDemo: null,
  updateParameters: null,
  runState: null,
  kernelSelector: null,
  penaltySlider: null,
  gammaSlider: null,
  degreeSlider: null,
  labelSelector: null,
}

main();
// Main entry point.
function main() {
  // Set state from hash.
  var format = d3.format(",");

  function setStateFromParams() {
    var params = {};
    window.location.hash.substring(1).split('&').forEach(function(p) {
      var tokens = p.split('=');
      params[tokens[0]] = tokens[1];
    });
    function getParam(key, fallback) {
      return params[key] === undefined ? fallback : params[key];
    }
    GLOBALS.state = {
	  kernel: +getParam('kernel', 'rbf'),
	  penalty: +getParam('penalty', 1),
      gamma: +getParam('gamma', 'auto'),
	  degree: +getParam('degree', 3),
      demo: +getParam('demo', 0),
      //demoParams: getParam('demoParams', '20,2').split(',').map(Number)
    };
	GLOBALS.predict = {
	  train: null,
	  test: null,
	};
	GLOBALS.dataPoints = {
	  train: null,
	  test: null,
	};
  }
  setStateFromParams();

  function triggerEvent() {
	var dataOptionsArea = document.getElementById('data-options');
	var event = new CustomEvent(
		"dataSetChange", 
		{
			bubbles: true,
			cancelable: true
		}
	);
	dataOptionsArea.dispatchEvent(event);
  }
  
  // Utility function for creating value sliders.
  function makeSlider(container, name, min, max, start) {
    var dis = d3.select(container).append("div").attr("id", "slider-div-" + name)
	
    dis.append("span").classed("slider-label-" + name, true)
      .text(name + ' ')
    var value = dis.append("span").classed("slider-value-" + name, true)
      .text(start)

    var slider = dis.append("input")
      .attr("type", "range")
      .attr("min", min)
      .attr("max", max)
      .attr("value", start)
      .on("change", updateParameters)
      .on("input", function() {
        value.text(slider.node().value);
		triggerEvent();
      })
    return slider.node();
  }
  
  // Utility function for creating select input
  function makeSelector(container, name, start, faceValues, realValues) {
	var dis = d3.select(container)
	var selector = dis.append("div").style("width", "250px").append("label").text(name + ' ')
		.append("select")
		.attr("name", "kernel");
		//.on('change', updateParameters);

	var data = [{value: "rbf", 		label: "RBF"}, 
				{value: "linear", 	label: "Linear"}, 
				{value: "poly", 	label: "Poly"}, 
				{value: "sigmoid", 	label: "Sigmoid"},
				{value: "precomputed",	label: "precomputed"}
				];
				
	selector.selectAll('option').data(data).enter().append('option').text(function (d) { return d.label; }).property("value", function (d) { return d.value;});
	dis.append("br");
	selector.on("change", function onchange() {
		 console.log(this.selectedOptions[0].value);
		 updateDegreeSlider(this.selectedOptions[0].value);
		 updateParameters();
		 triggerEvent();
		/*selectValue = d3.select('select').property('value')
		d3.select('body')
				.append('p')
				.text(selectValue + ' is the last selected option.')*/
	});
	return selector.node();
  }
  
  // Create menu of possible demos.
  var menuDiv = d3.select("#data-menu");

  var dataMenus = menuDiv.selectAll(".demo-data")
      .data(demos)
    .enter().append("div")
      .classed("demo-data", true)
      .on("click", function(d,i) {
        showDemo(i);
      });

  dataMenus.append("canvas")
    .attr("width", 150)
    .attr("height", 150)
    .each(function(d,i) {
      var demo = demos[i];
      var params = []; //[demo.options[0].start]
      if(demo.options[1]) params.push(demo.options[1].start)
      var points = demo.generator.apply(null, params);
      var canvas = d3.select(this).node();
	  var canvasD3 = d3.select(this);
      visualize(points, canvas, canvasD3, null, null, true)
    });

  dataMenus.append("span")
    .text(function(d) { return d.name});

  // Set up t-SNE UI.
  var kernelSelector = makeSelector('#svm-options', 'Kernel', GLOBALS.state.kernel);
  var penaltySlider = makeSlider('#svm-options', 'Penalty', 1, 100,
      GLOBALS.state.penalty);
  //var gammaSlider = makeSlider('#svm-options', 'Gamma', 1, 20,
  //    GLOBALS.state.gamma);
  var degreeSlider = makeSlider('#svm-options', 'Degree', 1, 10,
	  GLOBALS.state.degree);
  GLOBALS.penaltySlider = penaltySlider
  //GLOBALS.gammaSlider = gammaSlider
  GLOBALS.degreeSlider = degreeSlider
  updateDegreeSlider(GLOBALS.state.kernel);

  function updateDegreeSlider(kernel) {
	  if (kernel !== 'poly') {
		  d3.select("#slider-div-Degree").style("display", "none");
	  } else {
		  d3.select("#slider-div-Degree").style("display", "block");
	  }
  }
  // Controls for data options.
  var optionControls;
  var demo;

  GLOBALS.updateParameters = updateParameters;
  function updateParameters() {
    //GLOBALS.state.demoParams = optionControls.map(function(s) {return s.value;});
	GLOBALS.state.dataSet = demo.name.toLowerCase();
    GLOBALS.state.gamma = "auto";
    GLOBALS.state.penalty = penaltySlider.value;
	GLOBALS.state.degree = degreeSlider.value;
	GLOBALS.state.kernel = kernelSelector.value;

    d3.select("#share").style("display", "")
      .attr("href", "#" + generateHash())

    runState();
  }

  /*function runSVM() {
	d3.select("#floatingCirclesG").style("display", "block");
	
	updateParameters();
	var url;
	if (demo.description === "train") {
		url = "http://localhost:5000/runsvm/train";
	} else {
		url = "http://localhost:5000/runsvm/test";
	}
	params = JSON.stringify({"kernel": GLOBALS.state.kernel, "gamma": "auto", "penalty": Number(GLOBALS.state.penalty), "degree": Number(GLOBALS.state.degree)});
	var http = new XMLHttpRequest();
    http.open("POST", url, true);
	
	http.setRequestHeader("Content-type", "application/json; charset=utf-8");
	//http.setRequestHeader("Content-length", params.length);
	//http.setRequestHeader("Connection", "close");

	http.onreadystatechange = function() {
		d3.select("#floatingCirclesG").style("display", "none");
		var jsonText = http.responseText;
		var jsonObject = JSON.parse(jsonText);
		precisionScoreData = jsonObject["precision_score"];
		recallScoreData = jsonObject["recall_score"];
		f1ScoreData = jsonObject["f1score"];
		refreshChart();
		console.log("receive response: " + jsonText.substr(0,100))
	}
	http.send(params);
  }*/
  
  function generateHash() {
    function stringify(map) {
      var s = '';
      for (key in map) {
        s += '&' + key + '=' + map[key];
      }
      return s.substring(1);
    }
    //window.location.hash = stringify(GLOBALS.state);
    return stringify(GLOBALS.state);
  }

  GLOBALS.runState = runState;
  function runState() {
    // Set up t-SNE and start it running.
    var points = demo.generator.apply(null, GLOBALS.state.demoParams);
	if (GLOBALS.predict[GLOBALS.state.dataSet] !== null) {
		for (var i = 0; i < points.length; i++) {
			points[i].coords[4] = GLOBALS.predict[GLOBALS.state.dataSet][i];
		}
	}
	
    var canvas = document.getElementById('output');
	var canvasD3 = d3.select('#playground-canvas');

    // if there was already a playground demo going, lets destroy it and make a new one
    if(GLOBALS.playgroundDemo) {
      //GLOBALS.playgroundDemo.destroy();
      delete GLOBALS.playgroundDemo;
    }
    //runPlayground(points, canvas, GLOBALS.state, function(step) {
    GLOBALS.playgroundDemo = demoMaker(points, canvas, canvasD3, GLOBALS.state);
	/*, function(step) {
      d3.select("#step").text(format(step));
      if(step >= GLOBALS.stepLimit && !GLOBALS.unpausedBefore) {
        setRunning(false)
      }
    })*/
    GLOBALS.unpausedBefore = false;
    //GLOBALS.playgroundDemo.unpause();
    //setRunning(true);
  }

  /*var playPause = document.getElementById('play-pause');
  function setRunning(r) {
    GLOBALS.running = r;
    GLOBALS.playgroundRunning = r;
    if (GLOBALS.running) {
      GLOBALS.playgroundDemo.unpause();
      playPause.setAttribute("class", "playing")
    } else {
      GLOBALS.playgroundDemo.pause();
      playPause.setAttribute("class", "paused")
    }
  }*/

  // Hook up play / pause / restart buttons.
  /*playPause.onclick = function() {
    GLOBALS.unpausedBefore = true;
    setRunning(!GLOBALS.running);
  };*/

  //document.getElementById('restart').onclick = runSVM;

  // Show a given demo.
  GLOBALS.showDemo = showDemo;
  function showDemo(index, initializeFromState) {
	if (GLOBALS.state.demo === index && demo !== undefined) {
		return;
	}
	d3.select("#charts").style("display", "none");
	GLOBALS.state.demo = index;
    demo = demos[index];
    // Show description of demo data.
    //document.querySelector('#data-description span').textContent = demo.description;
    //d3.select("#data-description span").text(demo.description)
    // Create UI for the demo data options.
    var dataOptionsArea = document.getElementById('data-options');
    dataOptionsArea.innerHTML = '';
    optionControls = demo.options.map(function(option, i) {
      var value = initializeFromState ? GLOBALS.state.demoParams[i] : option.start;
      return makeSlider(dataOptionsArea, option.name,
          option.min, option.max, value);
    });

    menuDiv.selectAll(".demo-data")
      .classed("selected", false)
      .filter(function(d,i) { return i === index })
      .classed("selected", true)

    updateParameters();
	triggerEvent();
  }

  // run initial demo;
  setTimeout(function() {
    showDemo(GLOBALS.state.demo, true);
    // hide the share link initially
    d3.select("#share").style("display", "none")
  },1);

  d3.select(window).on("popstate", function() {
    setTimeout(function() {
      //updateParameters();
      setStateFromParams();
      showDemo(GLOBALS.state.demo, true)
    },1)
  })

  d3.select(window).on("scroll.playground", function() {
    if(scrollY > 1000) {
      if(GLOBALS.playgroundRunning) {
        //setRunning(false);
      }
    } else {
      if(!GLOBALS.playgroundRunning) {
        // setRunning(true)
      }
    }
  })
}
