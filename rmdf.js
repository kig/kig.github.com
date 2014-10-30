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

	var Vec3 = function(x,y,z) {
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
	var add = function(u,v,d) {
		d[0] = u[0]+v[0]; d[1] = u[1]+v[1]; d[2] = u[2]+v[2];
		return d;
	};
	var scale = function(u,s,d) {
		d[0] = u[0]*s; d[1] = u[1]*s; d[2] = u[2]*s;
		return d;
	};
	var length = function(v) {
		return Math.sqrt(dot(v,v));
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

	var rc = Vec3(0.0);
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
	var traceTmp = Vec3(0.0);
	var trace = function(ro, rd, posTex) {
		var hit = {
			dist: 1e7,
			pick: -2
		};
		for (var i=0; i<16; i++) {
			var off = i*20;
			if (posTex[off+19] === 0) {
				continue;
			}
			traceTmp[0] = -posTex[off+16];
			traceTmp[1] = -posTex[off+17];
			traceTmp[2] = -posTex[off+18];
			var r = posTex[off];
			raySphere(ro, rd, traceTmp, r, i, hit);
		}
		return hit;
	};

	var up = Vec3(0.0, 1.0, 0.0);
	var uvd = Vec3(0.0);
	var xaxis = Vec3(0.0), yaxis = Vec3(0.0), zaxis = Vec3(0.0);
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




	// Distance field renderer objects
	DF = {};
	DF._tmpVec = Vec3(0.0);
	DF._tmpMatrix = mat4.create();
	DF.mergeBoundingSpheres = function(s1, s2) {
		var a = s1, b = s2;
		if (b.radius > a.radius) {
			a = s2, b = s1;
		}
		var s = {center: Vec3(0.0), radius: 0};
		var v = this._tmpVec;
		sub(a, b, v);
		var distance = length(v);
		if (distance + b.radius <= a.radius) {
			return a;
		}
		var f = b.radius / a.radius;
		scale(v, 0.5 * f, v);
		s.radius = a.radius + b.radius * f;
		s.center.set(v);
		return s;
	};

	testMerge = function() {
		var s1 = {center: [0,0,0], radius: 1};
		var s2 = {center: [1,0,0], radius: 0.5};
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 0.25) > 1e-5 && Math.abs(m.radius - 1.25) > 1e-5) {
			console.log("Error with partial overlap merge");
		}
		s2.center[0] = 0.25;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 0.0) > 1e-5 && Math.abs(m.radius - 1.0) > 1e-5) {
			console.log("Error with full overlap a>b merge");
		}
		var m = DF.mergeBoundingSpheres(s2, s1);
		if (Math.abs(m.center[0] - 0.0) > 1e-5 && Math.abs(m.radius - 1.0) > 1e-5) {
			console.log("Error with full overlap b>a merge");
		}
		s2.center[0] = 2;
		s2.radius = 1;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.0) > 1e-5 && Math.abs(m.radius - 2.0) > 1e-5) {
			console.log("Error with no overlap merge");
		}
		s2.center[0] = 3;
		s2.radius = 1;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.5) > 1e-5 && Math.abs(m.radius - 2.5) > 1e-5) {
			console.log("Error with separated no overlap merge");
		}
		s2.center[0] = 3;
		s2.radius = 1e-7;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 2.0) > 1e-5 && Math.abs(m.radius - 2.0) > 1e-5) {
			console.log("Error with separated no overlap merge, point");
		}
	};
	//testMerge();

	DF.Types = {
		Sphere: 1,
		Box: 2,
		Torus: 3,
		Plane: 4,

		empty: 0
	};
	DF.typeNames = {};
	(function() {
		for (var i in DF.Types) {
			DF.typeNames[DF.Types[i]] = i;
		}
	})();

	DF.Material = function(options) {
		this.bufferArray = new Float32Array(8);
		this.transmit = new Float32Array(this.bufferArray.buffer, 0, 3);
		this.emit = new Float32Array(this.bufferArray.buffer, 4*4, 3);
		this.diffuse = 0.0;
		if (options) {
			for (var i in options) {
				if (this[i] && this[i].byteLength) { // Typed Array
					this[i].set(options[i]);
				} else {
					this[i] = options[i];
				}
			}
		}
	};
	DF.Material.prototype.write = function(array, offset) {
		this.bufferArray[7] = this.diffuse;
		array.set(this.bufferArray, offset);
	};

	DF.Object = function(options) {
		this.bufferArray = new Float32Array(4 /* Object info */ + 16 /* Transform matrix */);
		this.buffer = this.bufferArray.buffer;
		this.matrix = new Float32Array(this.buffer, 4*4, 16);
		mat4.identity(this.matrix);
		this.position = new Float32Array(this.buffer, 4 * ( 4+12 ), 3); // Last row of transform matrix.
		this.material = new DF.Material();
		this.materialIndex = 0;
		this.type = DF.Types.empty;
		this.boundingSphere = {center: this.position, radius: 0};
		if (options) {
			for (var i in options) {
				if (this[i] && this[i].byteLength) { // Typed Array
					this[i].set(options[i]);
				} else {
					this[i] = options[i];
				}
			}
		}
	};
	DF.Object.prototype.tick = function() {};
	DF.Object.prototype.write = function(array, offset) {
		mat4.copy(DF._tmpMatrix, this.matrix);
		mat4.invert(this.matrix, DF._tmpMatrix);
		this.bufferArray[19] = (this.type << 8) | this.materialIndex;
		array.set(this.bufferArray, offset);
		mat4.copy(this.matrix, DF._tmpMatrix);
	};
	DF.Object.prototype.computeBoundingSphere = function() {
		return this.boundingSphere;
	};

	DF.Sphere = function(options) {
		this.radius = 1;
		DF.Object.call(this, options);
		this.type = DF.Types.Sphere;
		this.computeBoundingSphere();
	};
	DF.Sphere.prototype = Object.create(DF.Object.prototype);
	DF.Sphere.prototype.write = function(array, offset) {
		this.bufferArray[0] = this.radius;
		DF.Object.prototype.write.call(this, array, offset);
	};
	DF.Sphere.prototype.computeBoundingSphere = function() {
		this.boundingSphere.radius = this.radius;
		return this.boundingSphere;
	};

	DF.Box = function(options) {
		this.width = this.height = this.depth = 1;
		DF.Object.call(this, options);
		this.type = DF.Types.Box;
		this.dimensions = new Float32Array(this.buffer, 0, 3);
		this.dimensions[0] = this.width;
		this.dimensions[1] = this.height;
		this.dimensions[2] = this.depth;
		if (this.cornerRadius === undefined) {
			this.cornerRadius = 0.05;
		}
		this.computeBoundingSphere();
	};
	DF.Box.prototype = Object.create(DF.Object.prototype);
	DF.Box.prototype.write = function(array, offset) {
		this.bufferArray[3] = this.cornerRadius;
		DF.Object.prototype.write.call(this, array, offset);
	};
	DF.Box.prototype.computeBoundingSphere = function() {
		var r = Math.max.apply(null, this.dimensions);
		this.boundingSphere.radius = r;
		return this.boundingSphere;
	};






	Loader.get(shaderURLs, function() {
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);
		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(16*8 * 2 * 4);
		posTex.width = 16 * 8;
		posTex.height = 2;
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');
		var iResolution = Vec3(glc.width, glc.height, 1.0);

	 	var gui = new dat.GUI();

		var controller = new DF.Box({position: [0.1, 0.1, 0.1], dimensions: [0.1, 0.1, 0.1]});
		controller.cornerRadius = 0.05;
		controller.material.diffuse = 0.1;
		controller.objects = [];
		controller.objectCount = 0;
		controller.gui = gui;
		controller.color = 0xFFFFFF;
		controller.createNew = function() {
			var cube = new DF[this.typeName]();
			cube.material.transmit.set([Math.random(), Math.random(), Math.random()])
			cube.material.diffuse = Math.random();
			this.objects[this.objectCount++] = cube;
			this.setCurrent(cube);
		};
		controller.setCurrent = function(current) {
			if (this.current && this.current.originalEmit != null) {
				//this.current.material.emit.set(this.current.originalEmit);
				//this.current.originalEmit = null;
			}
			this.current = current;
			if (this.current) {
				if (this.current.material.emit[0] !== 0.2) {
					//this.current.originalEmit = vec3.clone(this.current.material.emit);
					//this.current.material.emit.set(Vec3(0.2));
				}
				this.x.setValue(current.position[0]);
				this.y.setValue(current.position[1]);
				this.z.setValue(current.position[2]);
				this.diffuse.setValue(current.material.diffuse);
				this.transmit.setValue([].map.call(current.material.transmit, function(v) { return v*255; }))
				this.emit.setValue([].map.call(current.material.emit, function(v) { return v*255; }))
				this.type.setValue(DF.typeNames[current.type]);
				if (current.dimensions) {
					this.sX.setValue(current.dimensions[0]);
					this.sY.setValue(current.dimensions[1]);
					this.sZ.setValue(current.dimensions[2]);
				}
			} else {
				this.x.setValue(0);
				this.y.setValue(0);
				this.z.setValue(0);
				this.type.setValue('Box');				
			}
		};
		controller.proxy = function(propertyChain, min, max, step, name) {
			var controller = this;
			var tgt = controller;
			for (var i=0; i<propertyChain.length-1; i++) {
				tgt = tgt[propertyChain[i]];
			}
			var last = propertyChain[propertyChain.length-1];
			return this.gui.add(tgt, last, min, max, step).name(name).onChange(function(v) {
				var t = controller.current;
				if (t) {
					for (var i=0; i<propertyChain.length-1; i++) {
						t = t[propertyChain[i]];
					}
					t[last] = v;
				}
			});
		};
		controller.proxyColor = function(propertyChain, name) {
			var controller = this;
			var tgt = controller;
			for (var i=0; i<propertyChain.length-1; i++) {
				tgt = tgt[propertyChain[i]];
			}
			var last = propertyChain[propertyChain.length-1];
			tgt[last] = [].slice.call(tgt[last]);
			return this.gui.addColor(tgt, last).name(name).onChange(function(v) {
				var t = controller.current;
				if (t) {
					for (var i=0; i<propertyChain.length-1; i++) {
						t = t[propertyChain[i]];
					}
					t[last][0] = v[0]/255;
					t[last][1] = v[1]/255;
					t[last][2] = v[2]/255;
				}
			});
		};

		controller.typeName = 'Box';
		controller.type = gui.add(controller, 'typeName', ['Box', 'Sphere']).name("Type").onChange(function(type) {
			var idx = controller.objects.indexOf(controller.current);
			if (idx !== -1 && !(controller.current instanceof DF[type])) {
				controller.objects[idx] = new DF[type]({position: controller.current.position, material: controller.current.material});
				controller.setCurrent(controller.objects[idx]);
			}
		});


		controller.x = controller.proxy(['position', 0], -10.1, 10.1, 0.1, "X");
		controller.y = controller.proxy(['position', 1], -10.1, 10.1, 0.1, "Y");
		controller.z = controller.proxy(['position', 2], -10.1, 10.1, 0.1, "Z");

		controller.sX = controller.proxy(['dimensions', 0], 0.1, 6, 0.1, 'Width');
		controller.sY = controller.proxy(['dimensions', 1], 0.1, 6, 0.1, 'Height');
		controller.sZ = controller.proxy(['dimensions', 2], 0.1, 6, 0.1, 'Depth');

		controller.transmit = controller.proxyColor(['material', 'transmit'], 'Transmit');
		controller.emit = controller.proxyColor(['material', 'emit'], 'Emit');
		controller.diffuse = controller.proxy(['material', 'diffuse'], 0.0, 1.0, 0.01, 'Diffuse');

		gui.add(controller, 'createNew');

		controller.createNew();

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
		var mouse = new Float32Array(4);
		var alpha = 0;
		var theta = 0;

		var tDown = 0;

		var down = false;
		var clickEvent = false;
		var startX, startY;
		var cancelClick = false;

		glc.onmousedown = function(ev) {
			cancelClick = false;
			startX = mouse[2] = ev.layerX;
			startY = mouse[3] = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			down = true;
			tDown = t;
			ev.preventDefault();
		};
		glc.onclick = function(ev) {
			if (!cancelClick) {
				clickEvent = ev;
			} else {
				clickEvent = false;
			}
			cancelClick = false;
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
			var dx = mouse[0]-startX;
			var dy = mouse[1]-startY;
			if ((dx*dx + dy*dy) > 5*5) {
				cancelClick = true;
			}
			if (down) {
				var dx = mouse[2] - mouse[0];
				var dy = mouse[3] - mouse[1];
				alpha += 0.01 * dy;
				if (alpha > Math.PI*0.5) alpha = Math.PI*0.5;
				if (alpha < -Math.PI*0.5) alpha = -Math.PI*0.5;
				theta -= 0.01 * dx;
				cameraPos[0] = Math.sin(theta)*8 * Math.cos(alpha);
				cameraPos[1] = Math.sin(alpha)*8;
				cameraPos[2] = Math.cos(theta)*8 * Math.cos(alpha);
				mouse[2] = mouse[0];
				mouse[3] = mouse[1];
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
		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		var keyHandlers = {};
		keyHandlers[39] = function() {
			controller.current.position[0] += 0.3;			
		};
		keyHandlers[37] = function() {
			controller.current.position[0] -= 0.3;
		};
		keyHandlers[38] = function(ev) {
			controller.current.position[ev.shiftKey ? 2 : 1] += 0.3;
		};
		keyHandlers[40] = function(ev) {
			controller.current.position[ev.shiftKey ? 2 : 1] -= 0.3;
		};
		keyHandlers[8] = function(ev) {
			if (currentObject !== null) {
				objects.splice(currentObject, 1);
				currentObject = target = null;
			}
		};
		window.onkeydown = function(ev) {
			var h = keyHandlers[ev.which];
			if (h) {
				//ev.preventDefault();
				//h(ev);
			}
		};

		var bounce = function(ev) {
			ev.preventDefault();
			var self = this;
			var p = this.position[1];
			var t = 0;
			var ival = setInterval(function() {
				if (t > 1000) {
					t = 1000;
					clearInterval(ival);
				}
				self.position[1] = p + Math.abs(Math.sin((t/1000)*2*Math.PI));
				t += 16;
			}, 16);
		};

		var cameraPos = new Float32Array(4); // xyz, roll angle
		var cameraPosV = new Float32Array(4); // xyz, roll angle
		var cameraTarget = new Float32Array(4); // xyz, zoom
		var cameraTargetV = new Float32Array(4); // xyz, zoom
		cameraPos[0] = Math.sin(theta)*8 * Math.cos(alpha);
		cameraPos[1] = Math.sin(alpha)*8;
		cameraPos[2] = Math.cos(theta)*8 * Math.cos(alpha);
		cameraTarget[0] = 0; //(tx-cameraTarget[0])*0.05;
		cameraTarget[1] = 0; //(ty-cameraTarget[1])*0.05;
		cameraTarget[2] = 0; //(tz-cameraTarget[2])*0.05;
		cameraTarget[3] = 1;
		var cx0, cy0, cz0;
		var x0,y0,z0,i,j;
		var dt = 16/1000;
		var cdir = Vec3(0.0);
		var target = 3;
		var startT = Date.now();

		var sceneBoundingSphere = new Float32Array(4);

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

				var objects = controller.objects;
				while (objects.length < 16) {
					objects.push(new DF.Object());
				}
				var pick = -2.0;
				if (down) {
					getDir(iResolution, cameraPos, cameraTarget, mouse, cdir);
					pick = trace(cameraPos, cdir, posTex).pick;
					if (pick >= 0) {
						controller.setCurrent(controller.objects[pick]);
					} else {
						controller.setCurrent(null);
					}
				}
				if (clickEvent) {
					if (pick >= 0) {
						var o = objects[pick];
						if (o.onclick) {
							o.onclick(clickEvent);
						}
					}
					clickEvent = false;
				}
				for (var j=0; j<objects.length; j++) {
					objects[j].tick();
				}
				for (var j=0; j<objects.length; j++) {
					objects[j].materialIndex = j;
					objects[j].write(posTex, j*20);
					objects[j].material.write(posTex, posTex.width*4 + j*8);
				}
				var tx,ty,tz;
				tx = ty = tz = 0;
				var r = 30 + 100 * (0.5+0.5*Math.cos(Math.PI*Math.min(Math.max(0, t-1000), 1000)/1000));
				u4fv(gl, p, 'iCamera', cameraPos);
				u4fv(gl, p, 'iCameraTarget', cameraTarget);

				var s = objects[0].computeBoundingSphere();
				for (var i=1; i<objects.length; i++) {
					s = DF.mergeBoundingSpheres(s, objects[i].computeBoundingSphere());
				}
				sceneBoundingSphere.set(s.center);
				sceneBoundingSphere[3] = s.radius;
				u4fv(gl, p, 'iBoundingSphere', sceneBoundingSphere);

				updateTexture(gl, pTex, posTex, 1);

				var lightPos = Vec3(
					-Math.cos(t/1000)*-8.5, 
					Math.sin(t/1000)*3.0 - 4.0, 
					-(Math.sin(t/1000)*4.0)
				);
				u3fv(gl, p, 'iLightPos', lightPos);
				u1f(gl, p, 'iGlobalTime', t/1000);
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

