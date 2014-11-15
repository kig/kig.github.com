(function(){
var init = function() {
	if (DEBUG) console.log('script start to execute: '+(Date.now()-window.startScript)+' ms');

	if (window.mobile) {
		alert("This page may crash your mobile browser. Try on a Mac / Linux box instead.")
		return;
	}

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

	window.showPopup = function(title, content, x, y) {
		var popup = document.getElementById('popup');
		var cx = window.innerWidth / 2;
		var cy = window.innerHeight / 2;
		var dx = x - cx;
		var dy = y - cy;
		popup.style.left = x + 'px';
		popup.style.top = y + 'px';
		popup.classList.add('visible');
		popup.querySelector('.close').onclick = hidePopup;
		popup.querySelector('h2').textContent = title;
		popup.querySelector('.content').innerHTML = content;
	};

	window.hidePopup = function() {
		var popup = document.getElementById('popup');
		popup.classList.remove('visible');		
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

	// Resize the point sprite buffer to match window size.
	// The point sprite buffer consists of 8x8 px point sprites that cover the window dimensions. 
	//
	var resizeBuffer = function(gl, buf) {
		var cols = glc.width/8;
		var rows = glc.height/8;
		if (buf.cols === Math.ceil(cols) && buf.rows === Math.ceil(rows)) {
			return;
		}
		buf.cols = Math.ceil(cols);
		buf.rows = Math.ceil(rows);
		var arr = new Float32Array(Math.ceil(cols)*Math.ceil(rows)*2);
		var iHalfCols = 2 / cols;
		var iHalfRows = 2 / rows;
		var i=0;
		for (var y=0; y<rows; y++) {
			for (var x=0; x<cols; x++) {
				arr[i++] = x * 8 + 4;
				arr[i++] = y * 8 + 4;
			}
		}
		buf.vertCount = arr.length/2;
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
	};

	// Create buffer for drawing the scene plane.
	// The buffer consists of 8x8 px point sprite XY coords.
	//
	var createBuffer = function(gl) {
		var buf = gl.createBuffer();
		resizeBuffer(gl, buf);
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
	var u2fv = function(gl, p, name, v) {
		gl.uniform2fv(getUniform(gl, p, name), v);
	};
	var u4f = function(gl, p, name, x,y,z,w) {
		gl.uniform3f(getUniform(gl, p, name), x,y,z,w);
	};
	var u3f = function(gl, p, name, x,y,z) {
		gl.uniform3f(getUniform(gl, p, name), x,y,z);
	};
	var u2f = function(gl, p, name, x,y) {
		gl.uniform2f(getUniform(gl, p, name), x,y);
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

	var rc = Vec3(0.0);
	var raySphere = function(ro, rd, cen, r, idx, hit) {
		vec3.sub(rc, ro,cen);
		var c = vec3.dot(rc,rc);
		c -= r*r;
		var b = vec3.dot(rd, rc);
		var d = b*b - c;
		var t = -b - Math.sqrt(Math.abs(d));
		if (t > 0 && d > 0 && t < hit.dist) {
			hit.dist = t;
			hit.pick = idx;
		}
	};
	var traceTmp = Vec3(0.0);
	var traceTmpM3 = mat3.create();
	var trace = function(ro, rd, posTex) {
		var hit = {
			dist: 1e7,
			pick: -2
		};
		// We could just pass in controller and use the object bounding spheres.
		// But let's do it the hard way. Maybe we'll find bugs!
		for (var i=0; i<24; i++) {
			var off = i*20;
			if (posTex[off+19] === 0) {
				break;
			}
			traceTmpM3[0] = posTex[off+4];
			traceTmpM3[1] = posTex[off+5];
			traceTmpM3[2] = posTex[off+6];
			traceTmpM3[3] = posTex[off+8];
			traceTmpM3[4] = posTex[off+9];
			traceTmpM3[5] = posTex[off+10];
			traceTmpM3[6] = posTex[off+12];
			traceTmpM3[7] = posTex[off+13];
			traceTmpM3[8] = posTex[off+14];
			mat3.transpose(traceTmpM3, traceTmpM3);
			traceTmp[0] = posTex[off+16];
			traceTmp[1] = posTex[off+17];
			traceTmp[2] = posTex[off+18];
			vec3.transformMat3(traceTmp, traceTmp, traceTmpM3);
			vec3.scale(traceTmp, traceTmp, -1);
			var r = posTex[off];
			var t = Math.floor(posTex[off+19] / 256);
			if (t == DF.Types.Box) {
				var x = r;
				var y = posTex[off+1];
				var z = posTex[off+2];
				r = Math.sqrt(x*x+y*y+z*z);
			} else if (t == DF.Types.Torus || t == DF.Types.Torus82) {
				r *= 1.0 + posTex[off+1];
			}
			raySphere(ro, rd, traceTmp, r, i, hit);
		}
		return hit;
	};

	var up = Vec3(0.0, 1.0, 0.0);
	var uvd = Vec3(0.0);
	var cameraMat = mat3.create();
	var xaxis = new Float32Array(cameraMat.buffer, 0, 3);
	var yaxis = new Float32Array(cameraMat.buffer, 3*4, 3);
	var zaxis = new Float32Array(cameraMat.buffer, 2*3*4, 3);
	var getDir = function(iResolution, cameraPos, cameraTarget, fragCoord, dir) {
		uvd[0] = (-1.0 + 2.0*fragCoord[0]/iResolution[0]) * (iResolution[0]/iResolution[1]);
		uvd[1] = -1.0 + 2.0*fragCoord[1]/iResolution[1];
		uvd[2] = 1.0;
		vec3.normalize(uvd, uvd);
		vec3.normalize(zaxis, vec3.sub(zaxis, cameraTarget, cameraPos));
		vec3.normalize(xaxis, vec3.cross(xaxis, up, zaxis));
		vec3.normalize(yaxis, vec3.cross(yaxis, zaxis, xaxis));
		vec3.transformMat3(dir, uvd, cameraMat);
		return dir;
	};

	var updateCameraTranslate = function(cameraTranslate, cameraPos, cameraTarget) {
		vec3.normalize(zaxis, vec3.sub(zaxis, cameraTarget, cameraPos));
		vec3.normalize(xaxis, vec3.cross(xaxis, up, zaxis));
		vec3.normalize(yaxis, vec3.cross(yaxis, zaxis, xaxis));
		cameraTranslate.up.set(yaxis);
		cameraTranslate.right.set(xaxis);
		return cameraTranslate;
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
		vec3.sub(v, b.center, a.center);
		var distance = vec3.length(v);
		if (distance + b.radius <= a.radius) {
			return a;
		}
		s.radius = (distance + a.radius + Math.min(b.radius, Math.max(0, b.radius-(a.radius-distance)))) / 2;
		vec3.normalize(v,v);
		s.center.set(a.center);
		vec3.scale(v, v, -a.radius+s.radius);
		vec3.add(s.center, s.center, v);
		return s;
	};

	DF.testMerge = function() {
		var s1 = {center: [0,0,0], radius: 1};
		var s2 = {center: [1,0,0], radius: 0.5};
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 0.25) > 1e-5 && Math.abs(m.radius - 1.25) > 1e-5) {
			console.log("Error with partial overlap merge", m.center, m.radius);
		}
		s2.center[0] = 0.25;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 0.0) > 1e-5 && Math.abs(m.radius - 1.0) > 1e-5) {
			console.log("Error with full overlap a>b merge", m.center, m.radius);
		}
		var m = DF.mergeBoundingSpheres(s2, s1);
		if (Math.abs(m.center[0] - 0.0) > 1e-5 && Math.abs(m.radius - 1.0) > 1e-5) {
			console.log("Error with full overlap b>a merge", m.center, m.radius);
		}
		s2.center[0] = 2;
		s2.radius = 1;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.0) > 1e-5 && Math.abs(m.radius - 2.0) > 1e-5) {
			console.log("Error with no overlap merge", m.center, m.radius);
		}
		s2.center[0] = 3;
		s2.radius = 1;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.5) > 1e-5 && Math.abs(m.radius - 2.5) > 1e-5) {
			console.log("Error with separated no overlap merge", m.center, m.radius);
		}
		s2.center[0] = 3;
		s2.radius = 1e-7;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - 1.0) > 1e-5 && Math.abs(m.radius - 2.0) > 1e-5) {
			console.log("Error with separated no overlap merge, point", m.center, m.radius);
		}
		s2.center[0] = 3;
		s2.radius = 1;
		s1.center[0] = -4;
		s1.radius = 3;
		var m = DF.mergeBoundingSpheres(s1, s2);
		if (Math.abs(m.center[0] - (-1.5)) > 1e-5 && Math.abs(m.radius - 5.5) > 1e-5) {
			console.log("Error with separated no overlap merge -3, 3", m.center, m.radius);
		}
	};
	DF.testMerge();

	DF.Types = {
		Sphere: 1,
		Box: 2,
		Torus: 3,
		Prism: 4,
		Ring: 5,

		empty: 0
	};
	DF.typeNames = {};
	(function() {
		for (var i in DF.Types) {
			DF.typeNames[DF.Types[i]] = i;
		}
	})();

	DF._monitorChangedBufferArray = function() {
		this.lastBufferArray = new Float32Array(this.bufferArray.length);
		this.lastBufferArray[0] = ~this.bufferArray[0]; // Force changed state
		Object.defineProperty(this, 'changed', {
			get: function() {
				for (var i=0; i<this.bufferArray.length; i++) {
					if (this.bufferArray[i] !== this.lastBufferArray[i]) {
						return true;
					}
				}
				return false;
			},
			set: function(v) {
				if (v) {
					this.lastBufferArray[0] = ~this.bufferArray[0];
				} else {
					this.lastBufferArray.set(this.bufferArray);
				}
			}
		});
		this.write = function(array, offset) {
			array.set(this.bufferArray, offset);
			this.lastBufferArray.set(this.bufferArray);
		};
	};

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
		DF._monitorChangedBufferArray.call(this);
	};
	DF.Material.prototype.prepareWrite = function() {
		this.bufferArray[7] = this.diffuse;
	};

	DF.Object = function(options) {
		this.title = "";
		this.content = "";
		this.draggable = false;
		this.dragXAxis = null;
		this.dragYAxis = null;
		this.bufferArray = new Float32Array(4 /* Object info */ + 16 /* Transform matrix */);
		this.buffer = this.bufferArray.buffer;
		this.matrix = new Float32Array(this.buffer, 4*4, 16);
		mat4.identity(this.matrix);
		this.position = new Float32Array([0,0,0]);
		this.scale = new Float32Array([1,1,1]);
		this.rotationQuat = quat.create(); // Quaternion.
		this.rotation = new Float32Array([0,0,0]); // Euclidean XYZ rotation.
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
		DF._monitorChangedBufferArray.call(this);
	};
	DF.Object.prototype.tick = function(time) {
		if (this.ontick) {
			this.ontick(time)
		}
	};
	DF.Object.prototype.prepareWrite = function() {
		if (this.rotation) {
			quat.identity(this.rotationQuat);
			quat.rotateX(this.rotationQuat, this.rotationQuat, this.rotation[0])
			quat.rotateY(this.rotationQuat, this.rotationQuat, this.rotation[1])
			quat.rotateZ(this.rotationQuat, this.rotationQuat, this.rotation[2])
		}
		mat4.fromRotationTranslation(this.matrix, this.rotationQuat, this.position);
		if (this.scale) {
			mat4.scale(this.matrix, this.matrix, this.scale);			
		}
		mat4.copy(DF._tmpMatrix, this.matrix);
		mat4.invert(this.matrix, DF._tmpMatrix);
		this.bufferArray[19] = (this.type << 8) | this.materialIndex;
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
	DF.Sphere.prototype.prepareWrite = function() {
		this.bufferArray[0] = this.radius;
		DF.Object.prototype.prepareWrite.call(this);
	};
	DF.Sphere.prototype.computeBoundingSphere = function() {
		this.boundingSphere.radius = this.radius;
		return this.boundingSphere;
	};

	DF.Box = function(options) {
		DF.Object.call(this, options);
		this.dimensions = new Float32Array(this.buffer, 0, 3);
		this.dimensions.set((options && options.dimensions) || [1,1,1]);
		this.type = DF.Types.Box;
		if (this.cornerRadius === undefined) {
			this.cornerRadius = 0.05;
		}
		this.computeBoundingSphere();
	};
	DF.Box.prototype = Object.create(DF.Object.prototype);
	DF.Box.prototype.prepareWrite = function() {
		this.bufferArray[3] = this.cornerRadius;
		DF.Object.prototype.prepareWrite.call(this);
	};
	DF.Box.prototype.computeBoundingSphere = function() {
		var x = this.dimensions[0], y = this.dimensions[1], z = this.dimensions[2];
		var r = Math.sqrt(x*x + y*y + z*z);
		this.boundingSphere.radius = r;
		return this.boundingSphere;
	};

	DF.Torus = function(options) {
		this.radius = 1;
		this.innerRadius = 0.5;
		this.cornerRadius = 1.0;
		this.boxiness = 0.0;
		DF.Object.call(this, options);
		this.type = DF.Types.Torus;
		this.computeBoundingSphere();
	};
	DF.Torus.prototype = Object.create(DF.Object.prototype);
	DF.Torus.prototype.prepareWrite = function() {
		this.bufferArray[0] = this.radius * 0.5;
		this.bufferArray[1] = this.innerRadius * this.radius * 0.5;
		this.bufferArray[2] = this.cornerRadius;
		this.bufferArray[3] = this.boxiness;
		DF.Object.prototype.prepareWrite.call(this);
	};
	DF.Torus.prototype.computeBoundingSphere = function() {
		this.boundingSphere.radius = this.radius * Math.sqrt(2) * (1+this.innerRadius);
		return this.boundingSphere;
	};

	DF.Prism = function(options) {
		this.height = 1;
		this.radius = 0.5;
		DF.Object.call(this, options);
		this.type = DF.Types.Prism;
		this.computeBoundingSphere();
	};
	DF.Prism.prototype = Object.create(DF.Object.prototype);
	DF.Prism.prototype.prepareWrite = function() {
		this.bufferArray[0] = this.radius;
		this.bufferArray[1] = this.height;
		DF.Object.prototype.prepareWrite.call(this);
	};
	DF.Prism.prototype.computeBoundingSphere = function() {
		this.boundingSphere.radius = Math.sqrt(this.radius*this.radius + this.height*this.height)
		return this.boundingSphere;
	};

	DF.Ring = function(options) {
		this.radius = 1;
		this.innerRadius = 0.75;
		this.height = 0.25;
		this.cornerRadius = 0.01;
		DF.Object.call(this, options);
		this.type = DF.Types.Ring;
		this.computeBoundingSphere();
	};
	DF.Ring.prototype = Object.create(DF.Object.prototype);
	DF.Ring.prototype.prepareWrite = function() {
		this.bufferArray[0] = this.radius;
		this.bufferArray[1] = this.innerRadius * this.radius;
		this.bufferArray[2] = this.height;
		this.bufferArray[3] = this.cornerRadius;
		DF.Object.prototype.prepareWrite.call(this);
	};
	DF.Ring.prototype.computeBoundingSphere = function() {
		this.boundingSphere.radius = Math.sqrt(this.radius*this.radius + this.height * this.height);
		return this.boundingSphere;
	};

	Loader.get(shaderURLs, function() {
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);

		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(128 /* Fits 25 objects */ * 2 * 4);
		posTex.width = 128;
		posTex.height = 2;
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');
		var iResolution = Vec3(glc.width, glc.height, 1.0);

		var controller = new DF.Box({position: [0.1, 0.1, 0.1], dimensions: [0.1, 0.1, 0.1]});
		controller.changed = true;
		controller.minSampleCount = 2;
		controller.maxSampleCount = 8;
		controller.maxRaySteps = 200;
		controller.objects = [];
		controller.objectCount = 0;
		controller.maxObjectCount = window.windows ? 4 : 24;
		controller.setCurrent = function() {};

		window.rmdfController = controller;

		controller.skybox = {
			lightPos: Vec3(-5.1),
			sunColor: [1, 0.8, 0.5].map(function(v){ return v*255; }),
			skyColor: [0.25, 0.5, 0.5].map(function(v){ return v*255; }),
			groundColor: [0.2, 0.1, 0.1].map(function(v){ return v*255; }),
			horizonColor: [1, 0.8, 0.5].map(function(v){ return v*255; })
		};

		controller.camera = {
			ISO: 100,
			exposureCompensation: 0,
			shutterSpeed: 1/60,
			position: Vec3(5),
			target: Vec3(0.0)
		};

		var cv = vec3.sub(Vec3(0.0), controller.camera.position, controller.camera.target);
		controller.cameraDistance = vec3.length(cv);
		controller.cameraPhi = Math.atan2(cv[2], cv[0]);
		controller.cameraTheta = Math.acos(cv[1]/controller.cameraDistance);

		controller.deleteAllObjects = function() {
			this.objectCount = 0;
			this.objects.splice(0);
		};
		controller.loadDOM = function(rmdfScene) {
			this.deleteAllObjects();
			var parseColor = function(c){
				if (/^#......$/.test(c)) {
					var a = [];
					a.push(parseInt(c.substr(1,2), 16));
					a.push(parseInt(c.substr(3,2), 16));
					a.push(parseInt(c.substr(5,2), 16));
					return a;
				} else {
					return JSON.parse('['+c+']').map(function(v) { return v * 255; });
				}
			};

			var parseColorF = function(c){
				return parseColor(c).map(function(v) { return v / 255; });
			};

			if (rmdfScene.hasAttribute('sun-color')) { this.skybox.sunColor = parseColor(rmdfScene.getAttribute('sun-color')); }
			if (rmdfScene.hasAttribute('sky-color')) { this.skybox.skyColor = parseColor(rmdfScene.getAttribute('sky-color')); }
			if (rmdfScene.hasAttribute('ground-color')) { this.skybox.groundColor = parseColor(rmdfScene.getAttribute('ground-color')); }
			if (rmdfScene.hasAttribute('horizon-color')) { this.skybox.horizonColor = parseColor(rmdfScene.getAttribute('horizon-color')); }
			if (rmdfScene.hasAttribute('sun-position')) { this.skybox.lightPos.set(JSON.parse('['+rmdfScene.getAttribute('sun-position')+']')); }
			if (rmdfScene.hasAttribute('camera-position')) { this.camera.position.set(JSON.parse('['+rmdfScene.getAttribute('camera-position')+']')); }
			if (rmdfScene.hasAttribute('camera-target')) { this.camera.target.set(JSON.parse('['+rmdfScene.getAttribute('camera-target')+']')); }
			if (rmdfScene.hasAttribute('camera-iso')) { this.camera.ISO = parseFloat(rmdfScene.getAttribute('camera-iso')); }
			if (rmdfScene.hasAttribute('camera-exposure-compensation')) { this.camera.exposureCompensation = parseFloat(rmdfScene.getAttribute('camera-exposure-compensation')); }
			if (rmdfScene.hasAttribute('camera-shutter-speed')) { this.camera.shutterSpeed = parseFloat(rmdfScene.getAttribute('camera-shutter-speed')); }
			var cc = rmdfScene.childNodes;
			for (var i=0; i<cc.length; i++) {
				var c = cc[i];
				if (this.objectCount === this.maxObjectCount && c.tagName) {
					console.log("controller.loadDOM: Hit maximum object count, can't create more objects.");
					continue;
				}
				var options = {};
				options.material = new DF.Material();
				if (c.hasAttribute) {
					if (c.querySelector('title')) { options.title = c.querySelector('title').textContent; }
					if (c.querySelector('content')) { options.content = c.querySelector('content').innerHTML; }
					if (c.hasAttribute('position')) { options.position = JSON.parse('['+c.getAttribute('position')+']'); }
					if (c.hasAttribute('rotation')) { options.rotation = JSON.parse('['+c.getAttribute('rotation')+']'); }
					if (c.hasAttribute('scale')) { options.scale = JSON.parse('['+c.getAttribute('scale')+']'); }
					if (c.hasAttribute('matrix')) { options.matrix = JSON.parse('['+c.getAttribute('matrix')+']'); }
					if (c.hasAttribute('draggable')) { options.draggable = ('true' === c.getAttribute('draggable').toLowerCase()); }
					if (c.hasAttribute('drag-x-axis')) { options.dragXAxis = JSON.parse('['+c.getAttribute('drag-x-axis')+']'); }
					if (c.hasAttribute('drag-y-axis')) { options.dragYAxis = JSON.parse('['+c.getAttribute('drag-y-axis')+']'); }
					if (c.hasAttribute('material-transmit')) { options.material.transmit.set(parseColorF(c.getAttribute('material-transmit'))); }
					if (c.hasAttribute('material-diffuse')) { options.material.diffuse = parseFloat(c.getAttribute('material-diffuse')); }
					if (c.hasAttribute('material-emit')) { options.material.emit.set(parseColorF(c.getAttribute('material-emit'))); }
					if (c.querySelector('onclick')) { 
						options.onclickString = c.querySelector('onclick').textContent;
						options.onclick = new Function('ev', options.onclickString);
					}
					if (c.querySelector('ontick')) { 
						options.ontickString = c.querySelector('ontick').textContent;
						options.ontick = new Function('time', options.ontickString);
					}
				}
				switch (c.tagName) {
					case 'RMDF-BOX':
						if (c.hasAttribute('dimensions')) { options.dimensions = JSON.parse('['+c.getAttribute('dimensions')+']'); }
						if (c.hasAttribute('corner-radius')) { options.cornerRadius = parseFloat(c.getAttribute('corner-radius')); }
						this.objects[this.objectCount++] = new DF.Box(options);
						break;
					case 'RMDF-SPHERE':
						if (c.hasAttribute('radius')) { options.radius = parseFloat(c.getAttribute('radius')); }
						this.objects[this.objectCount++] = new DF.Sphere(options);
						break;
					case 'RMDF-TORUS':
						if (c.hasAttribute('radius')) { options.radius = parseFloat(c.getAttribute('radius')); }
						if (c.hasAttribute('inner-radius')) { options.innerRadius = parseFloat(c.getAttribute('inner-radius')); }
						if (c.hasAttribute('corner-radius')) { options.cornerRadius = parseFloat(c.getAttribute('corner-radius')); }
						if (c.hasAttribute('boxiness')) { options.boxiness = parseFloat(c.getAttribute('boxiness')); }
						this.objects[this.objectCount++] = new DF.Torus(options);
						break;
					case 'RMDF-PRISM':
						if (c.hasAttribute('radius')) { options.radius = parseFloat(c.getAttribute('radius')); }
						if (c.hasAttribute('height')) { options.innerRadius = parseFloat(c.getAttribute('height')); }
						this.objects[this.objectCount++] = new DF.Prism(options);
						break;
					case 'RMDF-RING':
						if (c.hasAttribute('radius')) { options.radius = parseFloat(c.getAttribute('radius')); }
						if (c.hasAttribute('inner-radius')) { options.innerRadius = parseFloat(c.getAttribute('inner-radius')); }
						if (c.hasAttribute('height')) { options.height = parseFloat(c.getAttribute('height')); }
						this.objects[this.objectCount++] = new DF.Ring(options);
						break;
				}
			}

			var cv = vec3.sub(Vec3(0.0), this.camera.position, this.camera.target);
			this.cameraDistance = vec3.length(cv);
			this.cameraPhi = Math.atan2(cv[2], cv[0]);
			this.cameraTheta = Math.acos(cv[1]/this.cameraDistance);
		};

		controller.loadHTML = function(html) {
			var div = document.createElement('div');
			div.innerHTML = html;
			var rmdfScene = div.querySelector('rmdf-scene');
			if (rmdfScene) {
				try {
					this.loadDOM(rmdfScene);
				} catch (e) {
					alert("Error loading scene: "+e.toString());
				}
			} else {
				alert("Couldn't load scene, no <rmdf-scene> element found.")
			}
		};

		var rmdfScene = document.querySelector('rmdf-scene');
		if (rmdfScene) {
			controller.loadDOM(rmdfScene);
		}

		var resize = function() {
			glc.width = window.innerWidth; // * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			glc.height = window.innerHeight; // * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			iResolution[0] = glc.width;
			iResolution[1] = glc.height;
			gl.viewport(0,0, glc.width, glc.height);
			u3fv(gl, p, 'iResolution', iResolution);
			controller.changed = true;
		};

		var p;
		var sel = document.body.querySelector('#shaders');
		var shaders = [];
		var currentShader = 0;
		var rtVert = arguments[0];
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

			var pos = gl.getAttribLocation(p, 'aPosition');
			gl.enableVertexAttribArray(pos);
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
			controller.changed = true;
		};
		for (var i=1; i<arguments.length; i++) {
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

		var tDown = 0;

		var down = false;
		var clickEvent = false;
		var startX, startY;
		var cancelClick = false;
		var downTarget = -1;
		var cameraTranslate = {up: Vec3(0,1,0), right: Vec3(1, 0, 0), tmp: Vec3(0.0)};

		glc.onmousedown = function(ev) {
			cancelClick = false;
			mouse[0] = ev.layerX;
			mouse[1] = this.offsetHeight-ev.layerY;
			startX = mouse[2] = ev.layerX;
			startY = mouse[3] = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			down = true;
			tDown = t;
			getDir(iResolution, controller.camera.position, controller.camera.target, mouse, cdir);
			downTarget = trace(controller.camera.position, cdir, posTex).pick;
			updateCameraTranslate(cameraTranslate, controller.camera.position, controller.camera.target);
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
			downTarget = -1;
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
				if (downTarget >= 0) {
					var c = controller.objects[downTarget];
					if (c.draggable || document.body.classList.contains('editmode')) {
						vec3.scale(cameraTranslate.tmp, c.dragXAxis || cameraTranslate.up, -dy/50);
						vec3.add(c.position, c.position, cameraTranslate.tmp);
						vec3.scale(cameraTranslate.tmp, c.dragYAxis || cameraTranslate.right, -dx/50);
						vec3.add(c.position, c.position, cameraTranslate.tmp);
					}
				} else {
					controller.cameraTheta -= 0.01 * dy;
					if (controller.cameraTheta > Math.PI) controller.cameraTheta = Math.PI;
					if (controller.cameraTheta < 0.001) controller.cameraTheta = 0.001; // Avoid camera singularity at 0. Probably screwy upvector.
					controller.cameraPhi += 0.01 * dx;
					controller.camera.position[0] = controller.cameraDistance * Math.sin(controller.cameraTheta) * Math.cos(controller.cameraPhi);
					controller.camera.position[1] = controller.cameraDistance * Math.cos(controller.cameraTheta);
					controller.camera.position[2] = controller.cameraDistance * Math.sin(controller.cameraTheta) * Math.sin(controller.cameraPhi);
					controller.changed = true;
				}
				mouse[2] = mouse[0];
				mouse[3] = mouse[1];
			}
		};
		glc.addEventListener('mousewheel', function(ev) {
			controller.cameraDistance *= Math.pow(1.002, -ev.wheelDeltaY);
			if (controller.cameraDistance < 6) { controller.cameraDistance = 6 };
			if (controller.cameraDistance > 12) { controller.cameraDistance = 12 };
			controller.camera.position[0] = controller.cameraDistance * Math.sin(controller.cameraTheta) * Math.cos(controller.cameraPhi);
			controller.camera.position[1] = controller.cameraDistance * Math.cos(controller.cameraTheta);
			controller.camera.position[2] = controller.cameraDistance * Math.sin(controller.cameraTheta) * Math.sin(controller.cameraPhi);
			controller.changed = true;
		}, false);
		window.onresize = resize;

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};
		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		controller.camera.position[0] = controller.cameraDistance * Math.sin(controller.cameraTheta) * Math.cos(controller.cameraPhi);
		controller.camera.position[1] = controller.cameraDistance * Math.cos(controller.cameraTheta);
		controller.camera.position[2] = controller.cameraDistance * Math.sin(controller.cameraTheta) * Math.sin(controller.cameraPhi);
		var cx0, cy0, cz0;
		var x0,y0,z0,i,j;
		var dt = 16/1000;
		var cdir = Vec3(0.0);
		var target = 3;
		var startT = Date.now();

		var sceneBoundingSphere = new Float32Array(4);

		controller.render = function() {
			updateTexture(gl, pTex, posTex, 1);

			u3fv(gl, p, 'iCamera', controller.camera.position);
			u3fv(gl, p, 'iCameraTarget', controller.camera.target);
			u4fv(gl, p, 'iBoundingSphere', sceneBoundingSphere);

			u3fv(gl, p, 'iLightPos', vec3.scale(DF._tmpVec, controller.skybox.lightPos, 1/255));
			u3fv(gl, p, 'iSunColor', vec3.scale(DF._tmpVec, controller.skybox.sunColor, 1/255));
			u3fv(gl, p, 'iSkyColor', vec3.scale(DF._tmpVec, controller.skybox.skyColor, 1/255));
			u3fv(gl, p, 'iGroundColor', vec3.scale(DF._tmpVec, controller.skybox.groundColor, 1/255));
			u3fv(gl, p, 'iHorizonColor', vec3.scale(DF._tmpVec, controller.skybox.horizonColor, 1/255));
			u1f(gl, p, 'iGlobalTime', t/1000);
			u1f(gl, p, 'iPick', controller.pick);
			u1f(gl, p, 'iObjectCount', controller.objectCount);
			u1f(gl, p, 'iISO', controller.camera.ISO);
			u1f(gl, p, 'iShutterSpeed', controller.camera.shutterSpeed);
			u1f(gl, p, 'iExposureCompensation', controller.camera.exposureCompensation);
			u4fv(gl, p, 'iMouse', mouse);

			u1f(gl, p, 'iMinSampleCount', controller.minSampleCount);
			u1f(gl, p, 'iMaxSampleCount', controller.maxSampleCount);
			u1i(gl, p, 'iMaxRaySteps', controller.maxRaySteps);

			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			resizeBuffer(gl, buf);
			gl.drawArrays(gl.POINTS, 0, buf.vertCount);
		};

		var changed = true;
		var tick = function() {
			changed = false;
			if (window.startScript) {
				if (window.performance && performance.timing && performance.timing.navigationStart) {
					console.log('navigationStart to first frame: '+(Date.now()-performance.timing.navigationStart)+' ms');
				}
				console.log('script start to first frame: '+(Date.now()-window.startScript)+' ms');
				window.startScript = 0;
			}
			t = Date.now() - startT;

			var objects = controller.objects;
			while (objects.length < 25) {
				objects.push(new DF.Object());
			}
			var pick = -2.0;
			if (clickEvent) {
				getDir(iResolution, controller.camera.position, controller.camera.target, mouse, cdir);
				pick = trace(controller.camera.position, cdir, posTex).pick;
				if (pick >= 0) {
					controller.setCurrent(controller.objects[pick]);
					var o = objects[pick];
					if (o.title && o.content) {
						showPopup(o.title, o.content, glc.width/2 + (clickEvent.pageX > glc.width/2 ? 150 : -250), clickEvent.pageY);
					}
					if (o.onclick) {
						try {
							o.onclick(clickEvent);
						} catch(e){ console.log(e); }
					}
				} else {
					controller.setCurrent(null);
				}
				clickEvent = false;
			}
			controller.pick = pick;
			for (var j=0; j<controller.objectCount; j++) {
				objects[j].tick(t);
				objects[j].prepareWrite();
				objects[j].material.prepareWrite();
			}
			changed = changed || controller.changed;
			controller.changed = false;
			for (var j=0; j<controller.objectCount; j++) {
				if (changed) {
					break;
				}
				changed = changed || objects[j].changed;
				changed = changed || objects[j].material.changed;
			}

			if (changed) {
				for (var j=0; j<objects.length; j++) {
					if (j >= controller.maxObjectCount) {
						break;
					}
					objects[j].materialIndex = (objects[j].type === DF.Types.empty ? 0 : j);
					objects[j].write(posTex, j*20);
					objects[j].material.write(posTex, posTex.width*4 + j*8);
				}
				var s = objects[0].computeBoundingSphere();
				for (var i=1; i<controller.objectCount; i++) {
					var os = objects[i].computeBoundingSphere();
					s = DF.mergeBoundingSpheres(s, os);
				}
				sceneBoundingSphere.set(s.center);
				sceneBoundingSphere[3] = s.radius;
				controller.render();
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
	if (window.gl && window.mat4) init();
	else setTimeout(ticker, 5);
};
ticker();
})();

