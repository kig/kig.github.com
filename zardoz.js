(function(){
var init = function() {
	if (DEBUG) console.log('script start to execute: '+(Date.now()-window.startScript)+' ms');

	/*
	var contact = document.getElementById('contact');

	document.getElementById('contact-link').onclick = function(ev){
		ev.preventDefault();
		if (contact.classList.contains('visible')) {
			contact.classList.remove('visible');
		} else {
			contact.classList.add('visible');
		}
	};
	 */

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
				if ('mblur.frag' === shaderURLs[currentShader]) {
					var pick = -2.0;
					if (down) {
						getDir(iResolution, cameraPos, cameraTarget, mouse, cdir);
						pick = trace(cameraPos, cdir, posTex).pick;
						if (pick >= 0) {
							target = pick;
						}
					}
					for (j=0; j<9; j++) {
						i = j*4;
						x0 = posTex[i];
						y0 = posTex[i+1];
						z0 = posTex[i+2];
						r0 = posTex[i+3];
						posTex[i] = Math.sin(i/3+t/2000)*16;
						posTex[i+1] = (16-i)*1.2;
						posTex[i+2] = Math.cos(i/3+t/2000)*16;
						//posTex[i+3] = 1.9+1.7*Math.sin(i/4+t/100);
						posTex[i+16*4] = (posTex[i]-x0)/dt;
						posTex[i+16*4+1] = (posTex[i+1]-y0)/dt;
						posTex[i+16*4+2] = (posTex[i+2]-z0)/dt;
						posTex[i+16*4+3] = (posTex[i+3]-r0)/dt;
					}
					var r = 30 + 100 * (0.5+0.5*Math.cos(Math.PI*Math.min(Math.max(0, t-1000), 1000)/1000));
					cx0 = cameraPos[0];
					cy0 = cameraPos[1];
					cz0 = cameraPos[2];
					cameraPos[0] = r;
					cameraPos[1] = 0; // += (posTex[target*4+1]-cameraPos[1])*0.1; //Math.sin(t/2500)*10;
					cameraPos[2] = r;
					cameraPosV[0] = (cameraPos[0]-cx0)/dt;
					cameraPosV[1] = (cameraPos[1]-cy0)/dt;
					cameraPosV[2] = (cameraPos[2]-cz0)/dt;
					cx0 = cameraTarget[0];
					cy0 = cameraTarget[1];
					cz0 = cameraTarget[2];
					cameraTarget[0] += (posTex[target*4+0]-cameraTarget[0])*0.05;
					cameraTarget[1] += (posTex[target*4+1]-cameraTarget[1])*0.05;
					cameraTarget[2] += (posTex[target*4+2]-cameraTarget[2])*0.05;
					cameraTarget[3] = 1;
					cameraTargetV[0] = (cameraTarget[0]-cx0)/dt;
					cameraTargetV[1] = (cameraTarget[1]-cy0)/dt;
					cameraTargetV[2] = (cameraTarget[2]-cz0)/dt;
					u4fv(gl, p, 'iCamera', cameraPos);
					u4fv(gl, p, 'iCameraTarget', cameraTarget);
					u4fv(gl, p, 'iCameraV', cameraPosV);
					u4fv(gl, p, 'iCameraTargetV', cameraTargetV);
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
		document.querySelector('#shaders').style.opacity = 1;
	});
};
var ticker = function() {
	if (window.gl) init();
	else setTimeout(ticker, 0);
};
ticker();
})();

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = "//connect.soundcloud.com/sdk.js";
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
	var SCPlayer = function(trackURL, el, params) {
		var self = this;
		this.trackURL = trackURL;
		this.el = el;
		SC.get(trackURL, function(track){
			if (track.tracks) {
				track = track.tracks[0];	
			}
			self.title = track.title;
			self.url = track.permalink_url;
			self.artist = track.user.username;
			self.artistURL = track.user.permalink_url;
			self.track = track;
			self.initializeDOM();
		});
		for (var i in params) this[i] = params[i];
		this.initializeDOM();
	};

	SCPlayer.prototype.onpause = function() {
		this.play.innerHTML = '&#9654;';
	};

	SCPlayer.prototype.onstop = function() {
		this.play.innerHTML = '&#9654;';
	};

	SCPlayer.prototype.onplay = function() {
		if (this.firstPlay) {
			return;
		}
		this.play.innerHTML = '<span class="music-pause"></span>';
	};

	SCPlayer.prototype.whileplaying = function() {
		if (this.firstPlay && this.sound.position > 0) {
			this.play.innerHTML = '<span class="music-pause"></span>';
			this.firstPlay = false;
		}
	};

	SCPlayer.prototype.initializeDOM = function() {
		var self = this;
		this.el.style.opacity = 0.3;
		this.play = this.el.querySelector('.music-play');
		this.linkEl = this.el.querySelector('.music-link');
		this.authorEl = this.el.querySelector('.music-author');
		this.titleEl = this.el.querySelector('.music-title');

		this.streaming = false;
		this.play.onclick = function() {
			if (!self.streaming) {
				self.streaming = true;
				self.firstPlay = true;
				self.sound.play();
				self.play.innerHTML = '';
				var c = document.createElement('canvas');
				c.width = 40;
				c.height = 46;
				var ctx = c.getContext('2d');
				ctx.fillStyle = 'white';
				var tick = function() {
					ctx.clearRect(0,0,c.width,c.height);
					var r = c.width/2 - 6;
					var t = Date.now();
					ctx.save();
					ctx.translate(c.width/2, c.height/2);
					ctx.beginPath();
					ctx.arc(Math.sin(t/1000)*r, Math.cos(t/1000)*r, 3, 0, 2*Math.PI, true);
					ctx.fill();
					ctx.beginPath();
					ctx.arc(Math.sin(Math.PI*(2/3)+t/1000)*r, Math.cos(Math.PI*(2/3)+t/1000)*r, 3, 0, 2*Math.PI, true);
					ctx.fill();
					ctx.beginPath();
					ctx.arc(Math.sin(Math.PI*(4/3)+t/1000)*r, Math.cos(Math.PI*(4/3)+t/1000)*r, 3, 0, 2*Math.PI, true);
					ctx.fill();
					ctx.restore();
					if (c.parentNode) {
						requestAnimationFrame(tick, c);
					}
				};
				self.play.appendChild(c);
				requestAnimationFrame(tick, c);
			} else {
				self.sound.togglePause();
			}
		};
		self.authorEl.textContent = self.artist;
		self.authorEl.href = self.artistURL;
		self.titleEl.textContent = self.title;
		self.titleEl.href = self.url;
		self.linkEl.href = self.url;
		SC.stream(self.trackURL, {
			autoPlay: false,
			onpause: self.onpause.bind(self),
			onplay: self.onplay.bind(self),
			onfinish: self.onstop.bind(self),
			onstop: self.onstop.bind(self),
			whileplaying: self.whileplaying.bind(self)
		}, function(sound){
			self.sound = sound;
		});
	};

	var ticks = 0;
	var sctick = function() {
		if (window.SC) {
			SC.initialize({
			    client_id: "7edc86ef9d085d9b071f1c1b7199a205"
			});
			window.scplayer = new SCPlayer("/tracks/99386315", document.getElementById('music'));			
		} else if (ticks < 100) {
			ticks++;
			setTimeout(sctick, 100);
		}
	};
	sctick();
})();

