var curvePoint = (function() {
	var xy = {x:0, y:0};

	var bezier = function(x0, y0, x1, y1, x2, y2, x3, y3, t, xy) {
		var t1 = 1-t;
		var t_2 = t*t;
		var t1_2 = t1*t1;
		var t_3 = t_2*t;
		var t1_3 = t1_2*t1;
		var t1_2t = t1_2*t*3;
		var t1t_2 = t1*t_2*3;
		xy.x = t1_3 * x0 + t1_2t * x1 + t1t_2 * x2 + t_3 * x3;
		xy.y = t1_3 * y0 + t1_2t * y1 + t1t_2 * y2 + t_3 * y3;
	};

	var yFromX = function(xTarget, x0, y0, x1, y1, x2, y2, x3, y3) {
		var xTolerance = 0.0001; //adjust as you please

		//establish bounds
		var lower = 0;
		var upper = 1;
		var t = (upper + lower) / 2;

		bezier(x0, y0, x1, y1, x2, y2, x3, y3, t, xy);

		var i = 0;

		//loop until completion
		while (Math.abs(xTarget - xy.x) > xTolerance && i < 10) {
			if(xTarget > xy.x) {
				lower = t;
			} else {
				upper = t;
			}

			t = (upper + lower) / 2;
			bezier(x0, y0, x1, y1, x2, y2, x3, y3, t, xy);

			i++;
		}

		//we're within tolerance of the desired x value.
		//return the y value.
		return xy.y;
	};

	return function(x, points) {
		points = points || Curves.zero;

		var x0 = points[0];
		var y0 = points[1];
		var x1 = points[2];
		var y1 = points[3];
		var x2 = points[4];
		var y2 = points[5];
		var x3 = points[6];
		var y3 = points[7];

		if (x < x0) {
			return y0;
		}
		if (x > x3) {
			return y3;
		}

		return yFromX(x, x0, y0, x1, y1, x2, y2, x3, y3);
	};
})();

var doc = document.implementation.createDocument(null, null, null);
var plotFCurve = function(svg, recording, framesPerSecond, animationDuration) {
	var bcr = svg.getBoundingClientRect();
	var w = bcr.width;
	var h = bcr.height;

	var xOff = 3;
	var yOff = h/2;

	var xScale = framesPerSecond * 8;
	var yScale = -2;

	var fCurves = svg.querySelector('.f-curves');
	while (fCurves.firstChild) {
		fCurves.removeChild(fCurves.firstChild);
	}
	var fCurveDots = svg.querySelector('.f-curve-dots');
	while (fCurveDots.firstChild) {
		fCurveDots.removeChild(fCurveDots.firstChild);
	}

	var color = [
		[
			'#ff0000',
			'#00ff00',
			'#0000ff',
			'#880088'
		],
		[
			'#884444',
			'#448844',
			'#444488',
			'#555555'
		]
	];

	var curveSegs = {};
	var lastX = xOff + animationDuration * xScale;
	var kf, pkf;
	for (var i = 0; i < recording.length; i++, pkf = kf) {
		var kf = recording[i];
		var x = xOff + kf.time * xScale;
		var idx = 0;
		for (var key in kf) {
			if (specialKeys[key]) {
				continue;
			}
			var v = kf[key];
			var vpaths = curveSegs[key];
			if (!vpaths) {
				vpaths = curveSegs[key] = [];
			}
			var colorArr = color[idx];
			idx = (idx + 1) % color.length;
			for (var j = 0; j < v.length; j++) {
				var path = [], previousPath, previousPathEl;
				var px, py;
				var y = yOff + v[j] * yScale;
				if (!vpaths[j]) {
					vpaths[j] = [];
					px = xOff;
					py = y;
				} else {
					previousPath = vpaths[j][vpaths[j].length-1];
					previousPathEl = previousPath && previousPath.el;
					px = previousPath[previousPath.length-2];
					py = previousPath[previousPath.length-1];
				}
				vpaths[j].push(path);
				if (pkf && pkf[key] && pkf[key][j] !== undefined) {
					path.push(
						"M",
						px, py,
						"C", 
						xOff + (pkf.time + pkf.fCurves[key][j][2]) * xScale, 
						yOff + (pkf[key][j] + pkf.fCurves[key][j][3]) * yScale,
						xOff + (kf.time + kf.fCurves[key][j][0]) * xScale,
						yOff + (v[j] + kf.fCurves[key][j][1]) * yScale,
						x, y
					);
				} else {
					path.push(
						"M",
						px, py,
						"C", 
						px, py,
						xOff + (kf.time + kf.fCurves[key][j][0]) * xScale,
						yOff + (v[j] + kf.fCurves[key][j][1]) * yScale,
						x, y
					);
				}

				if (i === recording.length - 1) {
					path.push(
						"L",
						lastX, y
					);
				}

				var pathEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
				pathEl.setAttributeNS(null, 'd', path.join(" "));
				pathEl.setAttributeNS(null, 'stroke', colorArr[j % colorArr.length]);
				path.el = pathEl;
				fCurves.appendChild(pathEl);

				var lineA = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
				lineA.setAttributeNS(null, 'x2', xOff + (kf.time + kf.fCurves[key][j][0]) * xScale);
				lineA.setAttributeNS(null, 'y2', yOff + (v[j] + kf.fCurves[key][j][1]) * yScale);
				lineA.setAttributeNS(null, 'x1', x);
				lineA.setAttributeNS(null, 'y1', y);
				fCurveDots.appendChild(lineA);

				var lineB = doc.createElementNS('http://www.w3.org/2000/svg', 'line');
				lineB.setAttributeNS(null, 'x2', xOff + (kf.time + kf.fCurves[key][j][2]) * xScale);
				lineB.setAttributeNS(null, 'y2', yOff + (v[j] + kf.fCurves[key][j][3]) * yScale);
				lineB.setAttributeNS(null, 'x1', x);
				lineB.setAttributeNS(null, 'y1', y);
				fCurveDots.appendChild(lineB);

				var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
				dotEl.setAttributeNS(null, 'cx', xOff + (kf.time + kf.fCurves[key][j][0]) * xScale);
				dotEl.setAttributeNS(null, 'cy', yOff + (v[j] + kf.fCurves[key][j][1]) * yScale);
				dotEl.setAttributeNS(null, 'r', 3);
				dotEl.kf = kf;
				dotEl.line = lineA;
				dotEl.path = path;
				dotEl.pathEl = pathEl;
				dotEl.pathIndex = vpaths[j].length-1;
				dotEl.paths = vpaths[j];
				dotEl.fCurves = kf.fCurves[key][j];
				dotEl.value = v;
				dotEl.valueIndex = j;
				var setFCurves = function(dx0, dy0, dx1, dy1) {
					var coords = {
						x0: xOff + (this.kf.time + this.fCurves[0]) * xScale,
						y0: yOff + (this.value[this.valueIndex] + this.fCurves[1]) * yScale,
						x1: xOff + (this.kf.time + this.fCurves[2]) * xScale,
						y1: yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale
					};
					this.fCurves[0] += dx0 / xScale;
					this.fCurves[1] += dy0 / yScale;
					this.fCurves[2] += dx1 / xScale;
					this.fCurves[3] += dy1 / yScale;
					this.fCurves.manual = true;

					this.line.setAttributeNS(null, 'x2', xOff + (this.kf.time + this.fCurves[0]) * xScale);
					this.line.setAttributeNS(null, 'y2', yOff + (this.value[this.valueIndex] + this.fCurves[1]) * yScale);
					this.sibling.line.setAttributeNS(null, 'x2', xOff + (this.kf.time + this.fCurves[2]) * xScale);
					this.sibling.line.setAttributeNS(null, 'y2', yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale);
					this.sibling.setAttributeNS(null, 'cx', xOff + (this.kf.time + this.fCurves[2]) * xScale);
					this.sibling.setAttributeNS(null, 'cy', yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale);
					this.path[6] = xOff + (this.kf.time + this.fCurves[0]) * xScale;
					this.path[7] = yOff + (this.value[this.valueIndex] + this.fCurves[1]) * yScale;
					this.pathEl.setAttributeNS(null, 'd', this.path.join(" "));
					if (this.pathIndex < this.paths.length-1) {
						var nextPath = this.paths[this.pathIndex+1];
						nextPath[4] = xOff + (this.kf.time + this.fCurves[2]) * xScale;
						nextPath[5] = yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale;
						nextPath.el.setAttributeNS(null, 'd', nextPath.join(" "));
					}
					return coords;
				};
				draggable(dotEl, ['cx', 'cy'], function(xy, dx, dy) {
					setFCurves.call(this, dx, dy, -dx, -dy);
					return xy;
				}, function() {});
				fCurveDots.appendChild(dotEl);

				var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
				dotEl.setAttributeNS(null, 'cx', xOff + (kf.time + kf.fCurves[key][j][2]) * xScale);
				dotEl.setAttributeNS(null, 'cy', yOff + (v[j] + kf.fCurves[key][j][3]) * yScale);
				dotEl.setAttributeNS(null, 'r', 3);
				dotEl.kf = kf;
				dotEl.line = lineB;
				dotEl.path = path;
				dotEl.pathEl = pathEl;
				dotEl.pathIndex = vpaths[j].length-1;
				dotEl.paths = vpaths[j];
				dotEl.fCurves = kf.fCurves[key][j];
				dotEl.value = v;
				dotEl.valueIndex = j;
				dotEl.sibling = fCurveDots.lastChild;
				fCurveDots.lastChild.sibling = dotEl;
				draggable(dotEl, ['cx', 'cy'], function(xy, dx, dy) {
					this.fCurves[0] -= dx / xScale;
					this.fCurves[1] -= dy / yScale;
					this.fCurves[2] += dx / xScale;
					this.fCurves[3] += dy / yScale;
					this.fCurves.manual = true;
					this.sibling.line.setAttributeNS(null, 'x2', xOff + (this.kf.time + this.fCurves[0]) * xScale);
					this.sibling.line.setAttributeNS(null, 'y2', yOff + (this.value[this.valueIndex] + this.fCurves[1]) * yScale);
					this.line.setAttributeNS(null, 'x2', xOff + (this.kf.time + this.fCurves[2]) * xScale);
					this.line.setAttributeNS(null, 'y2', yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale);
					this.sibling.setAttributeNS(null, 'cx', xOff + (this.kf.time + this.fCurves[0]) * xScale);
					this.sibling.setAttributeNS(null, 'cy', yOff + (this.value[this.valueIndex] + this.fCurves[1]) * yScale);
					xy.x = xOff + (this.kf.time + this.fCurves[2]) * xScale;
					xy.y = yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale;
					this.path[6] = xOff + (this.kf.time + this.fCurves[0]) * xScale;
					this.path[7] = yOff + (this.value[this.valueIndex] + this.fCurves[1]) * yScale;
					this.pathEl.setAttributeNS(null, 'd', this.path.join(" "));
					if (this.pathIndex < this.paths.length-1) {
						var nextPath = this.paths[this.pathIndex+1];
						nextPath[4] = xOff + (this.kf.time + this.fCurves[2]) * xScale;
						nextPath[5] = yOff + (this.value[this.valueIndex] + this.fCurves[3]) * yScale;
						nextPath.el.setAttributeNS(null, 'd', nextPath.join(" "));
					}
					return xy;
				}, function() {});
				fCurveDots.appendChild(dotEl);

				var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
				dotEl.setAttributeNS(null, 'cx', x);
				dotEl.setAttributeNS(null, 'cy', y);
				dotEl.setAttributeNS(null, 'r', 3);
				dotEl.kf = kf;
				dotEl.path = path;
				dotEl.pathEl = pathEl;
				dotEl.fCurves = kf.fCurves[key][j];
				dotEl.value = v;
				dotEl.valueIndex = j;
				dotEl.rightSibling = fCurveDots.lastChild;
				dotEl.leftSibling = fCurveDots.lastChild.sibling;
				fCurveDots.appendChild(dotEl);


			}
			break;
		}
	}
};

var plotCurve = function(svg, curve) {
	var p1 = svg.querySelector('.p1');
	var p2 = svg.querySelector('.p2');
	var c1 = svg.querySelector('.c1');
	var c2 = svg.querySelector('.c2');
	var path = svg.querySelector('.curve');
	var line1 = svg.querySelector('.pc1');
	var line2 = svg.querySelector('.pc2');

	var bcr = svg.getBoundingClientRect();
	var w = bcr.width - 20;
	var h = bcr.height - 20;

	p1.setAttribute('cx', curve[0]*w);
	p1.setAttribute('cy', h-curve[1]*h);
	p2.setAttribute('cx', curve[6]*w);
	p2.setAttribute('cy', h-curve[7]*h);

	c1.setAttribute('x', curve[2]*w-5);
	c1.setAttribute('y', h-curve[3]*h-5);
	c2.setAttribute('x', curve[4]*w-5);
	c2.setAttribute('y', h-curve[5]*h-5);

	path.setAttribute('d', [
		'M', 0, h-curve[1]*h,
		'L', curve[0]*w, h-curve[1]*h,
		'C', curve[2]*w, h-curve[3]*h,
			 curve[4]*w, h-curve[5]*h,
			 curve[6]*w, h-curve[7]*h,
		'L', w, h-curve[7]*h
	].join(" "));

	line1.setAttribute('d', [
		'M', p1.getAttribute('cx'), p1.getAttribute('cy'),
		'L', parseFloat(c1.getAttribute('x'))+5, parseFloat(c1.getAttribute('y'))+5
	].join(" "));
	line2.setAttribute('d', [
		'M', p2.getAttribute('cx'), p2.getAttribute('cy'),
		'L', parseFloat(c2.getAttribute('x'))+5, parseFloat(c2.getAttribute('y'))+5
	].join(" "));
};

var draggable = function(el, xyParams, moveCallback, upCallback) {
	var down = false;
	var previousX = 0;
	var previousY = 0;
	var startX = 0;
	var startY = 0;
	var onDown = function(ev) {
		down = true;
		startX = previousX = ev.clientX;
		startY = previousY = ev.clientY;
		if (ev.preventDefault) {
			ev.preventDefault();
		}
	};
	var onMove = function(ev) {
		if (down) {
			var dx = ev.clientX - previousX;
			var dy = ev.clientY - previousY;
			previousX = ev.clientX;
			previousY = ev.clientY;
			var x = parseFloat(el.getAttribute(xyParams[0]));
			var y = parseFloat(el.getAttribute(xyParams[1]));
			var xy = {x: x+dx, y: y+dy};
			var newXY = moveCallback.call(el, xy, dx, dy, startX, startY);
			el.setAttribute(xyParams[0], newXY.x);
			el.setAttribute(xyParams[1], newXY.y);
			if (ev.preventDefault) {
				ev.preventDefault();
			}
		}
	};
	var onUp = function(ev) {
		if (down) {
			down = false;
			if (ev.preventDefault) {
				ev.preventDefault();
			}
			upCallback();
		}
	};

	var touchWrap = function(touchHandler) {
		return function(ev) {
			ev.preventDefault();
			touchHandler(ev.touches[0]);
		}
	};

	el.addEventListener('mousedown', onDown, false);
	window.addEventListener('mousemove', onMove, false);
	window.addEventListener('mouseup', onUp, false);

	el.addEventListener('touchstart', touchWrap(onDown), false);
	el.addEventListener('touchmove', touchWrap(onMove), false);
	el.addEventListener('touchend', touchWrap(onUp), false);
	el.addEventListener('touchcancel', touchWrap(onUp), false);
};

var draggableCurve = function(svg, curveCallback) {
	var p1 = svg.querySelector('.p1');
	var p2 = svg.querySelector('.p2');
	var c1 = svg.querySelector('.c1');
	var c2 = svg.querySelector('.c2');
	var path = svg.querySelector('.curve');
	var line1 = svg.querySelector('.pc1');
	var line2 = svg.querySelector('.pc2');

	var updatePath = function() {
		var p1x = parseFloat(p1.getAttribute('cx'));
		var p1y = parseFloat(p1.getAttribute('cy'));
		var p2x = parseFloat(p2.getAttribute('cx'));
		var p2y = parseFloat(p2.getAttribute('cy'));

		var bcr = svg.getBoundingClientRect();
		var w = bcr.width - 20;
		var h = bcr.height - 20;

		var c1x = Math.clamp(parseFloat(c1.getAttribute('x')), p1x-5, p2x-5);
		c1.setAttribute('x', c1x);
		c1x += 5;

		var c2x = Math.clamp(parseFloat(c2.getAttribute('x')), p1x-5, p2x-5);
		c2.setAttribute('x', c2x);
		c2x += 5;

		var c1y = parseFloat(c1.getAttribute('y'))+5;
		var c2y = parseFloat(c2.getAttribute('y'))+5;
		path.setAttribute('d', [
			'M', '0', p1y,
			'L', p1x, p1y,
			'C', c1x, c1y, c2x, c2y, p2x, p2y,
			'L', w, p2y
		].join(" "));
		line1.setAttribute('d', [
			'M', p1x, p1y,
			'L', c1x, c1y
		].join(" "));
		line2.setAttribute('d', [
			'M', p2x, p2y,
			'L', c2x, c2y
		].join(" "));

		var curve = curveCallback();
		curve[0] = p1x / w;
		curve[1] = 1 - p1y / h;
		curve[2] = c1x / w;
		curve[3] = 1 - c1y / h;
		curve[4] = c2x / w;
		curve[5] = 1 - c2y / h;
		curve[6] = p2x / w;
		curve[7] = 1 - p2y / h;
	};

	draggable(p1, ['cx', 'cy'], function(xy) {
		var bcr = svg.getBoundingClientRect();
		var w = bcr.width - 20;
		var h = bcr.height - 20;
		xy.x = Math.clamp(xy.x, 0, parseFloat(p2.getAttribute('cx')));
		xy.y = Math.clamp(xy.y, 0, h);
		updatePath();
		return xy;
	}, updatePath);
	draggable(p2, ['cx', 'cy'], function(xy) {
	var bcr = svg.getBoundingClientRect();
		var w = bcr.width - 20;
		var h = bcr.height - 20;
		xy.x = Math.clamp(xy.x, parseFloat(p1.getAttribute('cx')), h);
		xy.y = Math.clamp(xy.y, 0, h);
		updatePath();
		return xy;
	}, updatePath);
	draggable(c1, ['x', 'y'], function(xy) {
	var bcr = svg.getBoundingClientRect();
		var w = bcr.width - 20;
		var h = bcr.height - 20;
		xy.x = Math.clamp(xy.x, parseFloat(p1.getAttribute('cx'))-5, parseFloat(p2.getAttribute('cx'))-5);
		xy.y = Math.clamp(xy.y, -5, h-5);
		updatePath();
		return xy;
	}, updatePath);
	draggable(c2, ['x', 'y'], function(xy) {
	var bcr = svg.getBoundingClientRect();
		var w = bcr.width - 20;
		var h = bcr.height - 20;
		xy.x = Math.clamp(xy.x, parseFloat(p1.getAttribute('cx'))-5, parseFloat(p2.getAttribute('cx'))-5);
		xy.y = Math.clamp(xy.y, -5, h-5);
		updatePath();
		return xy;
	}, updatePath);
};

