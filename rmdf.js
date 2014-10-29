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
	var sub = function(u,v,d) {
		d[0] = u[0]-v[0]; d[1] = u[1]-v[1]; d[2] = u[2]-v[2];
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

	var up = vec3(0.0, 1.0, 0.0);
	var uvd = vec3(0.0);
	var xaxis = vec3(0.0), yaxis = vec3(0.0), zaxis = vec3(0.0);
	var getDir = function(iResolution, cameraPos, cameraTarget, fragCoord, dir) {
		uvd[0] = (-1.0 + 2.0*fragCoord[0]/iResolution[0]) * (iResolution[0]/iResolution[1]);
		uvd[1] = -1.0 + 2.0*fragCoord[1]/iResolution[1];
		uvd[2] = 1.0;
		normalize(uvd);
		normalize(sub(cameraTarget, cameraPos, zaxis));
		normalize(cross(up, zaxis, xaxis));
		normalize(cross(zaxis, xaxis, yaxis));
		dir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], uvd);
		dir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], uvd);
		dir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], uvd);
		return dir;
	};

	Loader.get(shaderURLs, function() {
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);
		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(32*2 * 4);
		posTex.width = 32;
		posTex.height = 2;
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');
		var iResolution = vec3(glc.width, glc.height, 1.0);

		var resize = function() {
			glc.width = window.innerWidth * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			glc.height = window.innerHeight * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			iResolution[0] = glc.width;
			iResolution[1] = glc.height;
			gl.viewport(0,0, glc.width, glc.height);
			u3fv(gl, p, 'iResolution', iResolution);
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
			if (sel) {
				var el = document.createElement('li');
				el.innerHTML = i+1;
				el.onclick = function(ev) {
					setShader(parseInt(this.innerHTML)-1);
					ev.preventDefault();
				};
				sel.appendChild(el);
			}
			shaders.push(arguments[i]);
		}
		setShader(currentShader);


		var t = 0;
		var targetRot = 0;
		var targetOpen = 0;
		var mouse = new Float32Array(4);
		var iRot = 0;
		var iOpen = 0;

		var tDown = 0;

		var down = false;

		glc.onmousedown = function(ev) {
			mouse[2] = ev.layerX;
			mouse[3] = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			down = true;
			tDown = t;
			ev.preventDefault();
		};
		glc.onmouseup = function(ev) {
			mouse[2] = -1;
			mouse[3] = -1;
			targetOpen = targetOpen ? 0 : 1;
			down = false;
			ev.preventDefault();
		};
		glc.onmousemove = function(ev) {
			mouse[0] = ev.layerX;
			mouse[1] = this.offsetHeight-ev.layerY;
		};
		window.onresize = resize;

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};
		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		var currentObject = 0;
		var keyHandlers = {};
		var right = 39, up = 38, left = 37, down = 40;
		keyHandlers[right] = function() {
			objects[currentObject].targetPosition[0] += 0.3;			
		};
		keyHandlers[left] = function() {
			objects[currentObject].targetPosition[0] -= 0.3;
		};
		keyHandlers[up] = function() {
			objects[currentObject].targetPosition[1] += 0.3;
		};
		keyHandlers[down] = function() {
			objects[currentObject].targetPosition[1] -= 0.3;
		};
		window.onkeydown = function(ev) {
			var h = keyHandlers[ev.which];
			if (h) h(ev);
		};


		DF = {};

		DF.Types = {
			sphere: 1,
			roundedBox: 2,
			torus: 3,
			plane: 4,

			empty: 0
		};

		DF.Object = function(options) {
			this.buffer = new ArrayBuffer(4*8);
			this.position = new Float32Array(this.buffer, 0, 3);
			this.material = 0;
			this.type = DF.Types.empty;
			this.bufferArray = new Float32Array(this.buffer);
			if (options) {
				for (var i in options) {
					if (this[i] && this[i].byteLength) { // Typed Array
						this[i].set(options[i]);
					} else {
						this[i] = options[i];
					}
				}
			}
			this.targetPosition = new Float32Array(this.position);
		};
		DF.Object.prototype.tick = function() {
			if (this.targetPosition) {
				this.position[0] += (this.targetPosition[0] - this.position[0]) * 0.1;
				this.position[1] += (this.targetPosition[1] - this.position[1]) * 0.1;
				this.position[2] += (this.targetPosition[2] - this.position[2]) * 0.1;
			}
		};
		DF.Object.prototype.write = function(array, offset) {
			this.bufferArray[3] = (this.type << 8) | this.material;
			array.set(this.bufferArray, offset);
		};

		DF.Sphere = function(radius, options) {
			DF.Object.call(this, options);
			this.radius = radius;
			this.type = DF.Types.sphere;
		};
		DF.Sphere.prototype = Object.create(DF.Object.prototype);
		DF.Sphere.prototype.write = function(array, offset) {
			this.bufferArray[4] = this.radius;
			DF.Object.prototype.write.call(this, array, offset);
		};

		DF.Box = function(width, height, depth, cornerRadius, options) {
			DF.Object.call(this, options);
			this.type = DF.Types.roundedBox;
			this.dimensions = new Float32Array(this.buffer, 4*4, 3);
			this.dimensions[0] = width;
			this.dimensions[1] = height;
			this.dimensions[2] = depth;
			this.cornerRadius = cornerRadius || 0;
		};
		DF.Box.prototype = Object.create(DF.Object.prototype);
		DF.Box.prototype.write = function(array, offset) {
			this.bufferArray[7] = this.cornerRadius;
			DF.Object.prototype.write.call(this, array, offset);
		};

		var materials = [
			{transmit: [0.9, 0.6, 0.2], diffuse: 0.1, emit: [0,0,0]},
			{transmit: [0.1, 0.1, 0.1], diffuse: 0.5, emit: [0,0,0]},
			{transmit: [0.9, 0.9, 0.9], diffuse: 0, emit: [0,0,0]}
		];
		var objects = [
			new DF.Sphere(0.75, {position: [-1.15, -1.15, -1.15], material: 2}),
			new DF.Sphere(0.75, {position: [1.15, 1.15, 1.15], material: 1}),
			/*
			new DF.Sphere(0.75, {position: [1.15, -1.15, -1.15], material: 2}),
			new DF.Sphere(0.75, {position: [-1.15, 1.15, -1.15], material: 1}),
			new DF.Sphere(0.75, {position: [-1.15, -1.15, 1.15], material: 0}),
			new DF.Sphere(0.75, {position: [-1.15, 1.15, 1.15], material: 2}),
			new DF.Sphere(0.75, {position: [1.15, -1.15, 1.15], material: 1}),
			new DF.Sphere(0.75, {position: [1.15, 1.15, -1.15], material: 0}),
			*/
			new DF.Box(1,1,1, 0.05)
		];

		var cameraPos = new Float32Array(4); // xyz, roll angle
		var cameraPosV = new Float32Array(4); // xyz, roll angle
		var cameraTarget = new Float32Array(4); // xyz, zoom
		var cameraTargetV = new Float32Array(4); // xyz, zoom
		var cx0, cy0, cz0;
		var x0,y0,z0,i,j;
		var dt = 16/1000;
		var cdir = vec3(0.0);
		var target = 3;
		var startT = Date.now();

		var tick = function() {
			if (!blurred) {
				if (window.startScript) {
					if (window.performance && performance.timing && performance.timing.navigationStart) {
						console.log('navigationStart to first frame: '+(Date.now()-performance.timing.navigationStart)+' ms');
					}
					console.log('script start to first frame: '+(Date.now()-window.startScript)+' ms');
					window.startScript = 0;
				}
				t = Date.now() - startT;
				iRot += (targetRot - iRot) * 0.1;
				if (Math.abs(targetRot-iRot) < 0.001) {
					iRot = targetRot;
					iOpen += (targetOpen - iOpen) * 0.15;
					if (Math.abs(targetOpen - iOpen) < 0.01) {
						iOpen = targetOpen;
					}
				}

				if ('rmdf.frag' === shaderURLs[currentShader]) {
					var pick = -2.0;
					/*
					if (down) {
						getDir(iResolution, cameraPos, cameraTarget, mouse, cdir);
						pick = trace(cameraPos, cdir, posTex).pick;
						if (pick >= 0) {
							target = pick;
						}
					}
					*/
					for (var i=0; i<materials.length; i++) {
						var material = materials[i];
						posTex.set(material.transmit, 16*8 + i*8);
						posTex[2*16*4 + i*4 + 3] = material.diffuse;
						posTex.set(material.emit, 16*8 + i*8 + 4);
					}

					for (var j=0; j<objects.length; j++) {
						objects[j].tick();
					}
					for (var j=0; j<objects.length; j++) {
						objects[j].write(posTex, j*8);
					}
					var tx,ty,tz;
					tx = ty = tz = 0;
					var r = 30 + 100 * (0.5+0.5*Math.cos(Math.PI*Math.min(Math.max(0, t-1000), 1000)/1000));
					cameraPos[0] = -5;
					cameraPos[1] = 3;
					cameraPos[2] = 5;
					cameraTarget[0] = 0; //(tx-cameraTarget[0])*0.05;
					cameraTarget[1] = 0; //(ty-cameraTarget[1])*0.05;
					cameraTarget[2] = 0; //(tz-cameraTarget[2])*0.05;
					cameraTarget[3] = 1;
					u4fv(gl, p, 'iCamera', cameraPos);
					u4fv(gl, p, 'iCameraTarget', cameraTarget);
					updateTexture(gl, pTex, posTex, 1);
				}
				u1f(gl, p, 'iGlobalTime', t/1000);
				u1f(gl, p, 'iRot', iRot);
				u1f(gl, p, 'iOpen', iOpen);
				u1f(gl, p, 'iPick', pick);
				u1f(gl, p, 'iISO', 100.0);
				u1f(gl, p, 'iShutterSpeed', 1/60);
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

		var sel = document.querySelector('#shaders');
		if (sel) {
			sel.style.opacity = 1;
		}
	});
};
var ticker = function() {
	if (window.gl) init();
	else setTimeout(ticker, 0);
};
ticker();
})();

