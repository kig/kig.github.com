(function(){
var init = function() {
	if (DEBUG) console.log('script start to execute: '+(Date.now()-window.startScript)+' ms');

	window.requestAnimationFrame || (window.requestAnimationFrame = 
		window.webkitRequestAnimationFrame || 
		window.mozRequestAnimationFrame    || 
		window.oRequestAnimationFrame      || 
		window.msRequestAnimationFrame     || 
		function(callback, element) {
			return window.setTimeout(function() {
				callback(Date.now());
			}, 1000 / 60);
		}
	);

	Math.clamp = function(v, min, max) {
		if (v < min) {
			v = min;
		} else if (v > max) {
			v = max;
		}
		return v;
	};

	var createTexture = function(gl, buf, unit) {
		gl.activeTexture( gl.TEXTURE0+(unit||0) );
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		if (buf instanceof Float32Array) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.FLOAT, buf);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		return tex;
	};
	var updateTexture = function(gl, tex, buf, unit) {
		gl.activeTexture( gl.TEXTURE0+(unit||0) );
		gl.bindTexture(gl.TEXTURE_2D, tex);
		if (buf instanceof Float32Array) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.FLOAT, buf);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, buf.width, buf.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf);
		}
	};
	var createBuffer = function(gl) {
		var buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		var arr = new Float32Array([
			-1,-1, 0,
			 1,-1, 0,
			 1, 1, 0,
			-1,-1, 0,
			 1, 1, 0,
			-1, 1, 0
		]);
		gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
		return buf;
	};
	var createShader = function(gl, source, type) {
		var s = source;
		if (typeof source === 'string') {
			s = gl.createShader(type);
			gl.shaderSource(s, source);
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(s));
			}
		}
		return s;
	};
	var createProgram = function(gl, vert, frag) {
		var t0 = Date.now();
		var p = gl.createProgram();
		var vs = createShader(gl, vert, gl.VERTEX_SHADER);
		var fs = createShader(gl, frag, gl.FRAGMENT_SHADER);
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);
		gl.linkProgram(p);
		if (DEBUG) console.log('Create program: '+(Date.now()-t0)+' ms');
		return p;
	};
	var getUniform = function(gl, p, name) {
		if (!p.uniforms) p.uniforms = {};
		if (!p.uniforms[name]) p.uniforms[name] = gl.getUniformLocation(p, name);
		return p.uniforms[name];
	};
	var u4fv = function(gl, p, name, v) {
		gl.uniform4fv(getUniform(gl, p, name), v);
	};
	var u3fv = function(gl, p, name, v) {
		gl.uniform3fv(getUniform(gl, p, name), v);
	};
	var u3f = function(gl, p, name, x,y,z) {
		gl.uniform3f(getUniform(gl, p, name), x,y,z);
	};
	var u1f = function(gl, p, name, x) {
		gl.uniform1f(getUniform(gl, p, name), x);
	};
	var u1i = function(gl, p, name, x) {
		gl.uniform1i(getUniform(gl, p, name), x);
	};

	var vec3 = function(x,y,z) {
		var v = new Float32Array(3);
		x = x || 0;
		v[0] = x;
		v[1] = y || x;
		v[2] = z || x;
		return v;
	};
	var dot = function(u,v) {
		return u[0]*v[0] + u[1]*v[1] + u[2]*v[2];
	};
	var length = function(v) {
		return Math.sqrt(dot(v,v));
	};
	var add = function(u,v,d) {
		d[0] = u[0]+v[0]; d[1] = u[1]+v[1]; d[2] = u[2]+v[2];
		return d;
	};
	var sub = function(u,v,d) {
		d[0] = u[0]-v[0]; d[1] = u[1]-v[1]; d[2] = u[2]-v[2];
		return d;
	};
	var scale = function(u,f,d) {
		d[0] = u[0]*f; d[1] = u[1]*f; d[2] = u[2]*f;
		return d;
	};
	var normalize = function(v) {
		var ilen = 1 / Math.sqrt(dot(v,v));
		v[0] *= ilen; v[1] *= ilen; v[2] *= ilen;
		return v;
	};
	var cross = function(u,v,d) {
		d[0] = u[1]*v[2] - u[2]*v[1];
		d[1] = u[2]*v[0] - u[0]*v[2];
		d[2] = u[0]*v[1] - u[1]*v[0];
		return d;
	};
	var xyz = function(u, x, y, z) {
		u[0] = x; u[1] = y; u[2] = z;
		return u;
	};
	var mix = function(u, v, f, d) {
		for (var i = 0; i < u.length; i++) {
			d[i] = u[i]*(1-f) + v[i]*f;
		}
		return d;
	};
	var mixV = function(u, v, f, d) {
		for (var i = 0; i < u.length; i++) {
			d[i] = u[i]*(1-f[i]) + v[i]*f[i];
		}
		return d;
	};

	var rc = vec3(0.0);
	var raySphere = function(ro, rd, cen, r, idx, hit) {
		sub(ro,cen, rc);
		var c = dot(rc,rc);
		c -= r*r;
		var b = dot(rd, rc);
		var d = b*b - c;
		var t = -b - Math.sqrt(Math.abs(d));
		if (t > 0 && d > 0 && t < hit.dist) {
			hit.dist = t;
			hit.pick = idx;
		}
	};
	var traceTmp = vec3(0.0);
	var trace = function(ro, rd, posTex) {
		var hit = {
			dist: 1e7,
			pick: -2
		};
		for (var i=0; i<9; i++) {
			var off = i*4;
			traceTmp[0] = posTex[off];
			traceTmp[1] = posTex[off+1];
			traceTmp[2] = posTex[off+2];
			var r = posTex[off+3];
			raySphere(ro, rd, traceTmp, r, i, hit);
		}
		return hit;
	};

	var traceDisplayPlaneAt = function(ro, rd, planePoint, planeNormal, intersectOut) {
		var d = dot(rd, planeNormal);
		if (d > 1e-6) {
			sub(planePoint, ro, intersectOut);
			var t = dot(intersectOut, planeNormal) / d;
			if (t >= 0) {
				add(ro, scale(rd, t, intersectOut), intersectOut);
				return true;
			}
		}
		return false;
	};

	var trackElement = function(el, position, cameraPos, cameraTarget) {
		el.style.display = 'none';
	};

	var up = vec3(0.0, 1.0, 0.0);
	var uvd = vec3(0.0);
	var xaxis = vec3(0.0), yaxis = vec3(0.0), zaxis = vec3(0.0);
	var getDir = function(iResolution, cameraPos, cameraTarget, fragCoord, dir) {
		uvd[0] = (-1.0 + 2.0*fragCoord[0]/iResolution[0]) * (iResolution[0]/iResolution[1]) * cameraTarget[3];
		uvd[1] = (-1.0 + 2.0*fragCoord[1]/iResolution[1]) * cameraTarget[3];
		uvd[2] = 1.0;
		normalize(uvd);
		xyz(up, Math.sin(cameraPos[3]), Math.cos(cameraPos[3]), 0.0);
		normalize(sub(cameraTarget, cameraPos, zaxis));
		normalize(cross(up, zaxis, xaxis));
		normalize(cross(zaxis, xaxis, yaxis));
		dir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], uvd);
		dir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], uvd);
		dir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], uvd);
		return dir;
	};

	Loader.get(shaderURLs, function() {
		var forceRedraw = false;
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);
		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(4*16*2);
		posTex.width = 16;
		posTex.height = 2;
		for (var i=0; i<posTex.length; i+=4) {
			posTex[i] = (i/4-8)*2;
			posTex[i+1] = (i/4-8)*2;
			posTex[i+2] = (i/4-8)*2;
			posTex[i+3] = Math.max(1, i/4);
		}
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');
		var iResolution = vec3(glc.width, glc.height, 1.0);

		var resize = function() {
			// Disabled HiDPI because those machines don't have enough FLOPS per pixel. 
			// FIXME Re-enable in 2016.
			glc.width = window.innerWidth; // * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			glc.height = window.innerHeight; // * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			iResolution[0] = glc.width;
			iResolution[1] = glc.height;
			gl.viewport(0,0, glc.width, glc.height);
			u3fv(gl, p, 'iResolution', iResolution);
			forceRedraw = true;
		};

		var p;
		var sel = document.body.querySelector('#shaders');
		var shaders = [];
		var currentShader = 0;
		var rtVert = 'precision highp float;attribute vec3 position;void main() {gl_Position = vec4(position, 1.0);}';
		var rtShader = createShader(gl, rtVert, gl.VERTEX_SHADER);

		var setShader = function(idx) {
			currentShader = idx;
			p = shaders[currentShader];
			if (typeof p === 'string') {
				p = shaders[currentShader] = createProgram(gl, rtShader, p);
			}
			gl.useProgram(p);
			startT = Date.now();
			targetRot = targetOpen = iRot = iOpen = 0;
			u3fv(gl, p, 'iResolution', iResolution);
			u1i(gl, p, 'iChannel0', 0);
			u1i(gl, p, 'iChannel1', 1);
			var pos = gl.getAttribLocation(p, 'position');
			gl.enableVertexAttribArray(pos);
			gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0);
		};

		for (var i=0; i<arguments.length; i++) {
			var el = document.createElement('li');
			el.innerHTML = i+1;
			el.onclick = function(ev) {
				setShader(parseInt(this.innerHTML)-1);
				ev.preventDefault();
			};
			sel.appendChild(el);
			shaders.push(arguments[i]);
		}
		setShader(currentShader);


		var t = 0;
		var mouse = new Float32Array(4);

		var tDown = 0;

		var down = false;
		var pick = -2;

		var displayPlaneIntersect = vec3();
		var previousDisplayPlaneIntersect = vec3();
		var cameraNormal = vec3();
		var motion = vec3();
		var right = vec3();

		window.addEventListener('wheel', function(ev) {
			if (ev.target !== glc) return;
			ev.preventDefault();
			var d = ev.deltaY;
			cameraTarget[3] *= Math.pow(1.001, d);
			cameraTarget[3] = Math.min(Math.max(cameraTarget[3], 0.1), 10);
		}, false);

		window.onmousedown = function(ev) {
			if (ev.target !== glc) return;
			mouse[2] = ev.layerX;
			mouse[3] = glc.offsetHeight-ev.layerY;
			mouse[0] = mouse[2];
			mouse[1] = mouse[3];
			down = true;
			tDown = t;
			getDir(iResolution, cameraPos, cameraTarget, mouse, cdir);
			pick = trace(cameraPos, cdir, posTex).pick;
			if (pick >= 0) {
				target = pick;
				normalize(sub(cameraTarget, cameraPos, cameraNormal));
				traceDisplayPlaneAt(cameraPos, cdir, spheres[target].position, cameraNormal, displayPlaneIntersect);
				previousDisplayPlaneIntersect.set(displayPlaneIntersect);
				setCurrentObject("Sphere " + target);
			}
			ev.preventDefault();
		};

		window.onmouseup = function(ev) {
			mouse[2] = -1;
			mouse[3] = -1;
			if (down) {
				if (pick >= 0) {
					pick = -2;
				}
				target = -2;
				down = false;
				ev.preventDefault();
			}
		};

		window.onmousemove = function(ev) {
			if (down) {
				var mx = ev.layerX;
				var my = (glc.offsetHeight-ev.layerY);
				if (target >= 0) {
					mouse[0] = ev.layerX;
					mouse[1] = glc.offsetHeight-ev.layerY;
					getDir(iResolution, cameraPos, cameraTarget, mouse, cdir);
					normalize(sub(cameraTarget, cameraPos, cameraNormal));
					traceDisplayPlaneAt(cameraPos, cdir, spheres[target].position, cameraNormal, displayPlaneIntersect);
					spheres[target].position.set(displayPlaneIntersect);
					previousDisplayPlaneIntersect.set(displayPlaneIntersect);
				} else {
					var dx = mx - mouse[0];
					var dy = my - mouse[1];
					dx *= 0.1;
					dy *= 0.1;

					motion[0] = -dx;
					motion[1] = -dy;
					motion[2] = 0;

					xyz(up, Math.sin(cameraPos[3]), Math.cos(cameraPos[3]), 0);
					normalize(sub(cameraTarget, cameraPos, zaxis));
					normalize(cross(up, zaxis, xaxis));
					normalize(cross(zaxis, xaxis, yaxis));
					cdir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], motion);
					cdir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], motion);
					cdir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], motion);

					if (ev.shiftKey) {
						add(cameraPos, cdir, cameraPos);
						add(cameraTarget, cdir, cameraTarget);
					} else {
						scale(cdir, 0.5, cdir);
						sub(cameraTarget, cdir, cameraTarget);
					}
				}
			}
			mouse[0] = ev.layerX;
			mouse[1] = glc.offsetHeight-ev.layerY;
		};


		var framesPerSecond = 12;

		var motionVector = vec3();
		var rollSpeed = 0;
		var downMask = {};

		window.onkeydown = function(ev) {
			if (ev.altKey || ev.ctrlKey) {
				return;
			}
			if (downMask[ev.keyCode]) return;
			downMask[ev.keyCode] = true;
			var char = String.fromCharCode(ev.keyCode).toLowerCase();
			switch(char) {
				case 'w':
					// Go forward
					motionVector[2] += 1;
					break;
				case 's':
					// Go backward
					motionVector[2] += -1;
					break;
				case 'a':
					// Go left
					motionVector[0] += -1;
					break;
				case 'd':
					// Go right
					motionVector[0] += 1;
					break;
				case 'r':
					// Go up
					motionVector[1] += 1;
					break;
				case 'f':
					// Go down
					motionVector[1] += -1;
					break;
				case 'e':
					rollSpeed += 1;
					break;
				case 'q':
					rollSpeed += -1;
					break;
				default:

			}
		};

		window.onkeyup = function(ev) {
			if (!downMask[ev.keyCode]) return;
			downMask[ev.keyCode] = false;
			var char = String.fromCharCode(ev.keyCode).toLowerCase();
			switch(char) {
				case 'w':
					// Go forward
					motionVector[2] -= 1;
					break;
				case 's':
					// Go backward
					motionVector[2] -= -1;
					break;
				case 'a':
					// Go left
					motionVector[0] -= -1;
					break;
				case 'd':
					// Go right
					motionVector[0] -= 1;
					break;
				case 'r':
					// Go up
					motionVector[1] -= 1;
					break;
				case 'f':
					// Go down
					motionVector[1] -= -1;
					break;
				case 'c':
					addKeyframe();
					break;
				case 'z':
					if (ev.shiftKey) {
						goToBeginning();
					} else if (ev.altKey) {
						goToPreviousKeyframe();
					} else {
						goToPreviousFrame();						
					}
					break;
				case 'x':
					if (ev.shiftKey) {
						goToEnd();
					} else if (ev.altKey) {
						goToNextKeyframe();
					} else {
						goToNextFrame();
					}
					break;
				case 'e':
					rollSpeed -= 1;
					break;
				case 'q':
					rollSpeed -= -1;
					break;
				default:
					if (ev.keyCode === 32) {
						ev.preventDefault();
						play();
					}
			}
		};

		document.querySelector('.timeline .play').addEventListener('click', function(ev) {
			ev.preventDefault();
			play();
		}, false);

		document.querySelector('.timeline .previous-frame').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToPreviousFrame();
		}, false);

		document.querySelector('.timeline .previous-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToPreviousKeyframe();
		}, false);

		document.querySelector('.timeline .rewind').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToBeginning();
		}, false);

		document.querySelector('.timeline .next-frame').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToNextFrame();
		}, false);
		
		document.querySelector('.timeline .next-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToNextKeyframe();
		}, false);

		document.querySelector('.timeline .fast-forward').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToEnd();
		}, false);

		var eot = { downX: null };
		document.querySelector('.end-of-time').addEventListener('mousedown', function(ev) {
			ev.preventDefault();
			eot.downX = ev.clientX;
		}, false);

		window.addEventListener('mousemove', function(ev) {
			if (eot.downX !== null) {
				ev.preventDefault();
				var el = document.querySelector('.end-of-time');
				var delta = (ev.clientX - eot.downX);
				eot.downX = ev.clientX;
				animationDuration += delta / (framesPerSecond * 8);
				document.querySelector('.end-of-time').scrollIntoViewIfNeeded();
				updateKeyframes();
			}
		}, false);

		window.addEventListener('mouseup', function(ev) {
			if (eot.downX !== null) {
				ev.preventDefault();
				eot.downX = null;
				animationDuration = Math.round(animationDuration * framesPerSecond) / framesPerSecond;
				updateKeyframes();
			}
		}, false);

		document.querySelector('.new-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			addKeyframe();
		}, false);

		document.querySelector('.delete-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			deleteSelectedKeyframe();
		}, false);

		document.querySelector('.delete-all-keyframes').addEventListener('click', function(ev) {
			ev.preventDefault();
			deleteAllKeyframes();
		}, false);

		document.querySelector('.object-select select').addEventListener('change', function(ev) {
			setCurrentObject(this.value);
		}, false);

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
		var plotFCurve = function(svg) {
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

			var curveSegs = {};
			var lastX = xOff + animationDuration * xScale;
			for (var i = 0; i < recording.length; i++) {
				var kf = recording[i];
				var x = xOff + kf.time * xScale;
				for (var key in kf) {
					if (specialKeys[key]) {
						continue;
					}
					var v = kf[key];
					var vpaths = curveSegs[key];
					if (!vpaths) {
						vpaths = curveSegs[key] = [];
					}
					for (var j = 0; j < v.length; j++) {
						var path = vpaths[j];
						var px, py, pcx, pcy, ppx, ppy;
						var y = yOff + v[j] * yScale;
						if (!path) {
							path = vpaths[j] = [];
							ppx = xOff;
							ppy = y;
							px = xOff;
							py = y;
							pcx = -0.25 * xOff;
							pcy = y;
						} else {
							var l = path.length;
							ppx = path[1];
							ppy = path[2];
							px = path[l-2];
							py = path[l-1];
							pcx = path[l-4];
							pcy = path[l-3];
						}
						path.push(
							"M",
							px, py,
							"C", 
							px + kf.fCurves[key][j][2] * (x-px), py + kf.fCurves[key][j][3] * (y-py),
							px + kf.fCurves[key][j][4] * (x-px), py + kf.fCurves[key][j][5] * (y-py),
							x, y
						);

						var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
						dotEl.setAttributeNS(null, 'd', [
							"M", path[path.length-6], path[path.length-5],
							"L", px, py,
							"M", path[path.length-4], path[path.length-3],
							"L", x, y
						].join(" "));
						fCurveDots.appendChild(dotEl);

						var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
						dotEl.setAttributeNS(null, 'cx', x);
						dotEl.setAttributeNS(null, 'cy', y);
						dotEl.setAttributeNS(null, 'r', 3);
						fCurveDots.appendChild(dotEl);

						var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
						dotEl.setAttributeNS(null, 'cx', path[path.length-6]);
						dotEl.setAttributeNS(null, 'cy', path[path.length-5]);
						dotEl.setAttributeNS(null, 'r', 2);
						fCurveDots.appendChild(dotEl);

						var dotEl = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
						dotEl.setAttributeNS(null, 'cx', path[path.length-4]);
						dotEl.setAttributeNS(null, 'cy', path[path.length-3]);
						dotEl.setAttributeNS(null, 'r', 2);
						fCurveDots.appendChild(dotEl);

						if (i === recording.length - 1) {
							path.push(
								"L",
								lastX, y
							);
						}
					}
				}
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

			var idx = 0;
			for (var key in curveSegs) {
				var vpaths = curveSegs[key];
				var colorArr = color[idx];
				idx = (idx + 1) % color.length;
				for (var j = 0; j < vpaths.length; j++) {
					var pathEl = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
					pathEl.setAttributeNS(null, 'd', vpaths[j].join(" "));
					pathEl.setAttributeNS(null, 'stroke', colorArr[j % colorArr.length]);
					fCurves.appendChild(pathEl);
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
			var onDown = function(ev) {
				down = true;
				previousX = ev.clientX;
				previousY = ev.clientY;
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
					var newXY = moveCallback(xy);
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

		var curveEditor = document.querySelector('.curve-editor svg');
		draggableCurve(curveEditor, function() {
			if (selectedKeyframe === null) {
				return [0, 0, 0.25, 0.25, 0.75, 0.75, 1, 1];
			}
			return selectedKeyframe.tweenCurve;
		});

		var selectedKeyframe = null;

		var resizeCurve = function() {
			plotFCurve(document.querySelector('.curve-editor svg'));
		};

		window.addEventListener('resize', resizeCurve, false);

		var svg = document.querySelector('.curveEditorCanvas');
		var fcc = svg.querySelector('.f-curve-container');

		svg.addEventListener('mousedown', function(ev) {
			ev.preventDefault();
			svg.down = true;
			svg.sx = ev.clientX;
			svg.sy = ev.clientY;
		}, false);

		window.addEventListener('mousemove', function(ev) {
			if (svg.down) {
				ev.preventDefault();
				var dx = ev.clientX - svg.sx;
				var dy = ev.clientY - svg.sy;
				svg.sx = ev.clientX;
				svg.sy = ev.clientY;
				var m = fcc.getCTM();
				// m.e += dx;
				m.f += dy;
				fcc.transform.baseVal.initialize(fcc.transform.baseVal.createSVGTransformFromMatrix(m));
			}
		}, false);

		window.addEventListener('mouseup', function(ev) {
			if (svg.down) {
				ev.preventDefault();
				svg.down = false;
			}
		}, false);

		svg.addEventListener('wheel', function(ev) {
			ev.preventDefault();
			var df = Math.pow(1.001, ev.deltaY);
			var m = fcc.getCTM();
			m.d *= df;
			fcc.transform.baseVal.initialize(fcc.transform.baseVal.createSVGTransformFromMatrix(m));
		});

		var setSelectedKeyframe = function(kf) {
			selectedKeyframe = kf;
			plotFCurve(document.querySelector('.curve-editor svg'));
		};

		var deselectKeyframe = function(kf) {
			selectedKeyframe = null;
			plotFCurve(document.querySelector('.curve-editor svg'));
		};

		var setCurrentObject = function(name) {
			document.querySelector('.object-select select').value = name;
			recording = timeline[name];
			currentObject = scene[name];
			var index = getCurrentKeyframeIndex();
			if (index !== null) {
				setSelectedKeyframe(recording[0]);
			} else {
				deselectKeyframe();
			}
			updateKeyframes();
		};

		var goToBeginning = function() {
			animationTime = 0;
		};

		var goToEnd = function() {
			animationTime = animationDuration;
		};

		var specialKeys = {id: true, fCurves: true, tweenCurves: true, time: true};

		var addKeyframe = function(kf) {
			if (!kf) {
				kf = {};
				var fCurves = {};
				var tweenCurves = {};
				for (var i in currentObject) {
					if (specialKeys[i]) { 
						continue;
					}
					kf[i] = [].slice.call(currentObject[i]);
					fCurves[i] = kf[i].map(function(k) { return [0, 0, 0.25, 0, 0.75, 1, 1, 1]; });
					tweenCurves[i] = kf[i].map(function(k) { return [0, 0, 0.25, 0.25, 0.75, 0.75, 1, 1]; });
				}
				kf.time = Math.floor(animationTime * (framesPerSecond)) / (framesPerSecond);
				kf.tweenCurves = tweenCurves;
				kf.fCurves = fCurves;
			}
			var added = false;
			for (var i=0; i<recording.length; i++) {
				if (recording[i].time > kf.time) {
					var d = 0;
					if (i > 0 && recording[i-1].time === kf.time) {
						d = 1;
						i--;
					}
					recording.splice(i, d, kf);
					added = true;
					break;
				}
			}
			if (!added) {
				if (recording.length > 0 && recording[recording.length-1].time === kf.time) {
					recording.pop();
				}
				recording.push(kf);
			}
			if (recording.length === 1 && kf.time !== 0) {
				var zeroKf = {};
				for (var i in kf) {
					zeroKf[i] = kf[i];
				}
				zeroKf.time = 0;
				recording.unshift(zeroKf);
			}
			setSelectedKeyframe(kf);
			updateKeyframes();
		};

		var modifyKeyframe = function(keyframe, modifications) {
			if (deleteKeyframe(keyframe)) {
				for (var i in modifications) {
					keyframe[i] = modifications[i];
				}
				addKeyframe(keyframe);
			}
		};

		var deleteKeyframe = function(keyframe) {
			var idx = recording.indexOf(keyframe);
			if (idx > -1) {
				recording.splice(idx, 1);
				return true;
			}
			return false;
		};

		var deleteSelectedKeyframe = function() {
			if (selectedKeyframe) {
				deleteKeyframe(selectedKeyframe);
				deselectKeyframe();
				updateKeyframes();			
			}
		};

		var deleteAllKeyframes = function() {
			recording.splice(0);
			deselectKeyframe();
			updateKeyframes();
		};

		var play = function() {
			playing = !playing;
		};

		var getCurrentKeyframeIndex = function() {
			if (recording.length === 0) {
				return null;
			}
			var kf = 0;
			for (var i=1; i<recording.length; i++) {
				if (recording[i].time > animationTime) {
					break;
				}
				kf = i;
			}
			return kf;
		};

		var goToNextFrame = function() {
			animationTime = Math.floor(animationTime * framesPerSecond + 1) / framesPerSecond;
			if (animationTime > animationDuration) {
				animationTime = animationDuration;
			}
		};

		var goToPreviousFrame = function() {
			animationTime = Math.floor(animationTime * framesPerSecond - 1) / framesPerSecond;
			if (animationTime < 0) {
				animationTime = 0;
			}
		};

		var goToNextKeyframe = function() {
			var idx = getCurrentKeyframeIndex();
			if (idx !== null && idx < recording.length-1) {
				animationTime = recording[idx+1].time;
			}
		};

		var goToPreviousKeyframe = function() {
			var idx = getCurrentKeyframeIndex();
			if (idx !== null) {
				if (idx > 0 && recording[idx].time + (playing ? 0.5 : 0) >= animationTime) {
					animationTime = recording[idx-1].time;
				} else {
					animationTime = recording[idx].time;
				}
			}
		};

		var goToTimeStripTime = function(ev, moving) {
			var frame = ((ev.clientX - timeStrip.getBoundingClientRect().left) / 8);
			var timeInSeconds = frame / framesPerSecond;

			if (!moving && ev.target.classList.contains('keyframe')) {
				animationTime = ev.target.time;
				setSelectedKeyframe(ev.target.keyframe);
				updateKeyframes();
			} else {
				if (downKeyframe !== null) {
					selectedKeyframe = downKeyframe;
					modifyKeyframe(downKeyframe, {time: Math.round(frame) / framesPerSecond});
					timeInSeconds = downKeyframe.time;
					updateKeyframes();
				} else {
					if (selectedKeyframe !== null) {
						deselectKeyframe();
						updateKeyframes();
					}
				}
				animationTime = Math.max(0, timeInSeconds);
			}
			ev.preventDefault();
		};

		var timeStrip = document.querySelector('.timestrip');
		var downKeyframe = null;

		timeStrip.addEventListener('mousedown', function(ev) {
			if (ev.target.classList.contains('keyframe')) {
				downKeyframe = ev.target.keyframe;
			}
			if (!ev.target.classList.contains('end-of-time')) {
				this.down = true;
				goToTimeStripTime(ev, false);
			}
		}, false);

		window.addEventListener('mousemove', function(ev) {
			if (timeStrip.down) {
				goToTimeStripTime(ev, true);
			}
		}, false);

		window.addEventListener('mouseup', function(ev) {
			timeStrip.down = false;
			downKeyframe = null;
		}, false);

		var updateKeyframes = function() {
			var timeStrip = document.querySelector('.timestrip .keyframes');
			timeStrip.innerHTML = '';
			for (var i=0; i<recording.length; i++) {
				var kf = document.createElement('div');
				kf.className = 'keyframe';
				if (selectedKeyframe === recording[i]) {
					kf.className += ' selected';
				}
				kf.time = recording[i].time;
				kf.keyframe = recording[i];
				kf.style.left = (
					recording[i].time // seconds
					* framesPerSecond // fps
					* 8 // keyframe width
				) + 'px';
				timeStrip.appendChild(kf);
			}
			document.querySelector('.end-of-time').style.left = ((animationDuration * framesPerSecond + 1) * 8) + 'px';
			document.querySelector('.active-time').style.width = ((animationDuration * framesPerSecond + 1) * 8) + 'px';
			plotFCurve(document.querySelector('.curve-editor svg'));
		};

		var getKeyframes = function(recording, animationTime) {
			if (recording.length === 0) {
				return null;
			}
			var f0 = recording[0], f1 = f0;
			if (f0.time < animationTime) {
				for (var i = 1; i < recording.length; i++) {
					f1 = recording[i];
					if (recording[i].time > animationTime) {
						break;
					}
					f0 = f1;
				}
			}
			var f = (animationTime - f0.time) / (f1.time - f0.time);
			f = Math.min(1, Math.max(0, isNaN(f) ? 0 : f));

			return {start: f0, end: f1, tweenPosition: f};
		};

		var interpolateKeyframes = function(keyName, startFrame, endFrame, t, target) {
			var v0 = startFrame[keyName];
			var v1 = endFrame[keyName];
			var dst = target[keyName];
			for (var i=0; i<v0.length; i++) {
				var ct = curvePoint(t, startFrame.tweenCurves[keyName][i]);
				var cp = curvePoint(ct, startFrame.fCurves[keyName][i]);
				dst[i] = v0[i] * (1-cp) + v1[i] * cp;
			}
		};

		var applyTimeline = function(timeline, target, animationTime) {
			var kfs = getKeyframes(timeline, animationTime);
			if (kfs !== null) {
				for (var i in kfs.start) {
					if (!specialKeys[i]) {
						// mix(kfs.start[i], kfs.end[i], kfs.tweenPosition, target[i]);
						interpolateKeyframes(i, kfs.start, kfs.end, kfs.tweenPosition, target);
					}
				}
			}
		};

		var applyTimelines = function(animationTime) {
			for (var key in timeline) {
				if (key === 'Camera' && currentObject !== scene['Camera']) {
					continue;
				}
				applyTimeline(timeline[key], scene[key], animationTime);
			}
		};

		window.onresize = resize;

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};

		var spheres = [];
		var contentContainer = document.querySelector('.content-3d');
		for (j=0; j<9; j++) {
			spheres[j] = {
				position: new Float32Array([Math.random()*10-5,Math.random()*10-5,Math.random()*10-5,1])
			};
			var div = document.createElement('div');
			div.innerHTML = "<h3>Title " + j + "</h3><p>This is some text.</p>";
			contentContainer.appendChild(div);
			spheres[j].html = div;
		}

		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		var lightPos = vec3(-8.5, 3.5, 5.4);

		var cameraPos = new Float32Array([0,0, -13, 0]); // xyz, roll angle
		var previousCameraPos = new Float32Array([0,0, -13, 0]); // xyz, roll angle
		var cameraPosV = new Float32Array(4); // xyz, roll angle
		var cameraTarget = new Float32Array([0,0,0,1]); // xyz, zoom
		var previousCameraTarget = new Float32Array([0,0,0,1]); // xyz, zoom
		var cameraTargetV = new Float32Array([0,0,0,0]); // xyz, zoom
		var cx0, cy0, cz0;
		var x0,y0,z0,i,j;
		var cdir = vec3(0.0);
		var target = -2;

		var playing = false;
		var t = 0, pt = 0, dt = 0;
		var animationTime = 0;
		var previousAnimationTime = 0;
		var animationDuration = 5;

		var scene = {};
		scene.Sky = {id: -2, position: lightPos};
		scene.Camera = {id: -2, position: cameraPos, target: cameraTarget};
		for (var i=0; i<spheres.length; i++) {
			scene["Sphere " + i] = {id: i, position: spheres[i].position};
		}

		var timeline = {};
		for (var i in scene) {
			timeline[i] = [];
			setCurrentObject(i);
			addKeyframe();
		}

		var recording, currentObject;
		setCurrentObject('Camera');

		pt = t = performance.now() / 1000;
		var tick = function() {
			if (!blurred || forceRedraw || window.noOnBlurPause) {
				forceRedraw = false;
				if (window.startScript) {
					if (window.performance && performance.timing && performance.timing.navigationStart) {
						console.log('navigationStart to first frame: '+(Date.now()-performance.timing.navigationStart)+' ms');
					}
					console.log('script start to first frame: '+(Date.now()-window.startScript)+' ms');
					window.startScript = 0;
				}

				t = performance.now() / 1000;
				dt = t-pt;
				pt = t;


				var playhead = document.querySelector('.playhead');
				if (playhead) {
					playhead.style.left = Math.floor(animationTime * framesPerSecond) * 8 + 'px';
					if (playing) {
						playhead.scrollIntoViewIfNeeded();
					}
				}

				if (playing || animationTime !== previousAnimationTime) {

					if (playing && animationTime > animationDuration) {
						animationTime = 0;
					}

					applyTimelines(animationTime);

					if (playing) {
						animationTime += dt;
					}

					previousAnimationTime = animationTime;

				} else {

					xyz(up, Math.sin(cameraPos[3]), Math.cos(cameraPos[3]), 0);
					normalize(sub(cameraTarget, cameraPos, zaxis));
					normalize(cross(up, zaxis, xaxis));
					normalize(cross(zaxis, xaxis, yaxis));
					cdir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], motionVector);
					cdir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], motionVector);
					cdir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], motionVector);

					scale(cdir, 10*dt, cdir);

					add(cameraPos, cdir, cameraPos);
					add(cameraTarget, cdir, cameraTarget);

					cameraPos[3] += rollSpeed * dt;
				}

				if (playing) {
					document.body.classList.add('playing');
				} else {
					document.body.classList.remove('playing');
				}

				for (j=0; j<9; j++) {
					i = j*4;
					x0 = posTex[i];
					y0 = posTex[i+1];
					z0 = posTex[i+2];
					r0 = posTex[i+3];
					posTex[i] = spheres[j].position[0];
					posTex[i+1] = spheres[j].position[1];
					posTex[i+2] = spheres[j].position[2];
					posTex[i+3] = spheres[j].position[3];
					posTex[i+16*4] = (posTex[i]-x0)/dt;
					posTex[i+16*4+1] = (posTex[i+1]-y0)/dt;
					posTex[i+16*4+2] = (posTex[i+2]-z0)/dt;
					posTex[i+16*4+3] = (posTex[i+3]-r0)/dt;
					var el = spheres[j].html;
					trackElement(el, spheres[j].position, cameraPos, cameraTarget);
				}
				updateTexture(gl, pTex, posTex, 1);

				cameraPosV[0] = (cameraPos[0]-previousCameraPos[0])/dt;
				cameraPosV[1] = (cameraPos[1]-previousCameraPos[1])/dt;
				cameraPosV[2] = (cameraPos[2]-previousCameraPos[2])/dt;
				cameraPosV[3] = (cameraPos[3]-previousCameraPos[3])/dt;
				previousCameraPos.set(cameraPos);
				cameraTargetV[0] = (cameraTarget[0]-previousCameraTarget[0])/dt;
				cameraTargetV[1] = (cameraTarget[1]-previousCameraTarget[1])/dt;
				cameraTargetV[2] = (cameraTarget[2]-previousCameraTarget[2])/dt;
				cameraTargetV[3] = (cameraTarget[3]-previousCameraTarget[3])/dt;
				previousCameraTarget.set(cameraTarget);

				u4fv(gl, p, 'iCamera', cameraPos);
				u4fv(gl, p, 'iCameraTarget', cameraTarget);
				u4fv(gl, p, 'iCameraV', cameraPosV);
				u4fv(gl, p, 'iCameraTargetV', cameraTargetV);

				u3fv(gl, p, 'iLightPos', lightPos);

				u1f(gl, p, 'iGlobalTime', animationTime);
				u1f(gl, p, 'iPick', currentObject.id);
				u1f(gl, p, 'iISO', 200.0);
				u1f(gl, p, 'iShutterSpeed', 1/120);
				u1f(gl, p, 'iExposureCompensation', +0);
				u4fv(gl, p, 'iMouse', mouse);

				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			}	
			requestAnimationFrame(tick, glc);
		};
		resize();
		tick();
		document.body.appendChild(glc);
	});
};
var ticker = function() {
	if (window.gl) init();
	else setTimeout(ticker, 0);
};
ticker();
})();

