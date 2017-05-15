if(typeof require != "undefined") {
 // hack for loading from generator
 var d3 = require('./d3.min.js')
}

function findColor(label) {
	var colorName = 'rgb(200,200,200)';
	switch(Math.round(label,0)) {
		case 0:
			colorName = 'rgb(255,188,100)';
			break;
		case 1:
			colorName = 'rgb(255,255,0)';
			break;
		case 2: 
			colorName = 'rgb(255,228,196)';
			break;		
		case 3:
			colorName = 'rgb(32,178,170)';
			break;		
		case 4:
			colorName = 'rgb(127,255,212)';
			break;
		case 5:
			colorName = 'rgb(255,127,0)';
			break;
		case 6:
			colorName = 'rgb(255,0,255)';
			break;
		case 7:
			colorName = 'rgb(0,255,255)';
			break;
		case 8:
			colorName = 'rgb(0,255,0)';
			break;
		case 9:
			colorName = 'rgb(143,188,143)';
			break;
		default:
			break;
	}
	return colorName;
}

// Helper function to draw a circle.
// TODO: replace with canvas blitting for web rendering
function circle(g, x, y, r) {
	g.beginPath();
	g.moveTo(x, y);
	g.arc(x, y, r/1.5, 0, 2 * Math.PI);
	g.fill();
	g.stroke();
}

// Visualize the given points with the given message.
// If "no3d" is set, ignore the 3D cue for size.
function visualize(points, canvas, canvasD3, message, no3d, useTrueLabel) {
  var width = canvas.width;
  var height = canvas.height;
  var g = canvas.getContext('2d');

  g.fillStyle = 'white';
  g.fillRect(0, 0, width, height);
  var xExtent = d3.extent(points, function(p) {return p.coords[0]});
  var yExtent = d3.extent(points, function(p) {return p.coords[1]});
  var zExtent = d3.extent(points, function(p) {return p.coords[2]});
  var zScale = d3.scaleLinear().domain(zExtent).range([2, 10]);

  var centerX = (xExtent[0] + xExtent[1]) / 2;
  var centerY = (yExtent[0] + yExtent[1]) / 2;
  var scale = Math.min(width, height) /
              Math.max(xExtent[1] - xExtent[0], yExtent[1] - yExtent[0]);
  scale *= .9; // Leave a little margin.
  //g.strokeStyle = 'rgba(255,255,255,.5)';
  var is3d = !no3d && points[0].coords.length > 2;
  var index = [];
  var n = points.length;
  if (is3d) {
    for (var i = 0; i < n; i++) {
      index[i] = i;
    }
    index.sort(function(a, b) {
      return d3.ascending(points[a].coords[2], points[b].coords[2]);
    });
  }
  					  			  
  for (var i = 0; i < n; i++) {
	var p = is3d ? points[index[i]] : points[i];
	g.strokeStyle = 'rgba(255,255,255,.5)';
	if (useTrueLabel) {
		g.fillStyle = findColor(p.coords[3]);	
	} else {
		g.fillStyle = findColor(p.coords[4]);
		if (p.coords[3] !== p.coords[4]) {
			g.strokeStyle = 'rgba(0,0,0,.5)';
		}
	}
	var x = (p.coords[0] - centerX) * scale + width / 2;
	var y = -(p.coords[1] - centerY) * scale + height / 2;
	var r = is3d ? zScale(p.coords[2]) : 4;
	circle(g, x, y, r);
  }
  
  if (message) {
    g.fillStyle = '#000';
    g.font = '24pt Lato';
    g.fillText(message, 8, 34);
  }
}

if(typeof module != "undefined") module.exports = {
  visualize: visualize
}
