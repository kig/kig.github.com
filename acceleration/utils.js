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
	for (var i=0; i<posTex.length; i+=4) {
		var r = posTex[i+3];
		if (r > 0) {
			traceTmp[0] = posTex[i];
			traceTmp[1] = posTex[i+1];
			traceTmp[2] = posTex[i+2];
			raySphere(ro, rd, traceTmp, r, i/4, hit);
		}
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

var getEye = function(useFourView, iResolution, cameraPos, cameraTarget, fragCoord, dir) {
	var uvX = (-1.0 + 2.0*fragCoord[0]/iResolution[0]);
	var uvY = (-1.0 + 2.0*fragCoord[1]/iResolution[1]);
	var f0 = fragCoord[0];
	var f1 = fragCoord[1];
	if (useFourView) {
		f0 *= 2;
		f1 *= 2;
	}
	var xIdx = 0;
	var yIdx = 1;
	if (!useFourView || (uvX < 0 && uvY > 0)) {
		dir[0] = cameraPos[0];
		dir[1] = cameraPos[1];
		dir[2] = cameraPos[2];
		return dir;
	}
	if (uvX > 0 && uvY > 0) { // top
		f0 -= iResolution[0];
		f1 -= iResolution[1];
		dir[1] = 100;
		xIdx = 0;
		yIdx = 2;
	} else if (uvX < 0 && uvY < 0) { // front
		dir[2] = -100;
		xIdx = 0;
		yIdx = 1;
	} else { // right
		f0 -= iResolution[0];
		dir[0] = 100;
		xIdx = 2;
		yIdx = 1;
	}
	dir[xIdx] = 10 * (-1.0 + 2.0*f0/iResolution[0]) * (iResolution[0]/iResolution[1]);
	dir[yIdx] = 10 * (-1.0 + 2.0*f1/iResolution[1]);
	return dir;
};

var _cdir = vec3();
var _cameraNormal = vec3();
var getDisplayPlaneIntersect = function(useFourView, iResolution, cameraPos, cameraTarget, mouse, targetPosition, displayPlaneIntersect) {
	var uvX = (-1.0 + 2.0*mouse[0]/iResolution[0]) * (iResolution[0]/iResolution[1]);
	var uvY = (-1.0 + 2.0*mouse[1]/iResolution[1]);
	if (!useFourView || (uvX < 0 && uvY > 0)) { // perspective
		getDir(useFourView, iResolution, cameraPos, cameraTarget, mouse, _cdir);
		normalize(sub(cameraTarget, cameraPos, _cameraNormal));
		traceDisplayPlaneAt(cameraPos, _cdir, targetPosition, _cameraNormal, displayPlaneIntersect);
	} else if (uvX > 0 && uvY > 0) { // top
		displayPlaneIntersect[0] = ((-1.0 + 2.0*(mouse[0]*2 - iResolution[0])/iResolution[0]) * (iResolution[0]/iResolution[1])) * 10;
		displayPlaneIntersect[1] = targetPosition[1];
		displayPlaneIntersect[2] = (uvY*2 - 1) * 10;
	} else if (uvX < 0 && uvY < 0) { // front
		displayPlaneIntersect[0] = ((-1.0 + 2.0*(mouse[0]*2)/iResolution[0]) * (iResolution[0]/iResolution[1])) * 10;
		displayPlaneIntersect[1] = ((uvY+1)*2 - 1) * 10;
		displayPlaneIntersect[2] = targetPosition[2];
	} else { // right
		displayPlaneIntersect[0] = targetPosition[0];
		displayPlaneIntersect[1] = ((uvY+1)*2 - 1) * 10;
		displayPlaneIntersect[2] = ((-1.0 + 2.0*(mouse[0]*2 - iResolution[0])/iResolution[0]) * (iResolution[0]/iResolution[1])) * 10;
	}
};

var up = vec3(0.0, 1.0, 0.0);
var uvd = vec3(0.0);
var xaxis = vec3(0.0), yaxis = vec3(0.0), zaxis = vec3(0.0);
var getDir = function(useFourView, iResolution, cameraPos, cameraTarget, fragCoord, dir) {
	var uvX = (-1.0 + 2.0*fragCoord[0]/iResolution[0]);
	var uvY = (-1.0 + 2.0*fragCoord[1]/iResolution[1]);
	if (!useFourView || (uvX < 0 && uvY > 0)) {
		var f0 = fragCoord[0];
		var f1 = fragCoord[1];
		if (useFourView) {
			f0 *= 2;
			f1 *= 2;
			f1 -= iResolution[1];
		}
		uvd[0] = (-1.0 + 2.0*f0/iResolution[0]) * (iResolution[0]/iResolution[1]) * cameraTarget[3];
		uvd[1] = (-1.0 + 2.0*f1/iResolution[1]) * cameraTarget[3];
		uvd[2] = 1.0;
		normalize(uvd);
		xyz(up, Math.sin(cameraPos[3]), Math.cos(cameraPos[3]), 0.0);
		normalize(sub(cameraTarget, cameraPos, zaxis));
		normalize(cross(up, zaxis, xaxis));
		normalize(cross(zaxis, xaxis, yaxis));
		dir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], uvd);
		dir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], uvd);
		dir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], uvd);
	} else if (uvX > 0 && uvY > 0) { // top
		dir[0] = 0;
		dir[1] = -1;
		dir[2] = 0;
	} else if (uvX < 0 && uvY < 0) { // front
		dir[0] = 0;
		dir[1] = 0;
		dir[2] = 1;
	} else { // right
		dir[0] = -1;
		dir[1] = 0;
		dir[2] = 0;
	}
	return dir;
};


var Stack = function() {
	this.top = null;
	this.bottom = null;
	this.length = 0;
};

Stack.prototype.push = function(value) {
	var node = {previous: this.top, next: null, value: value};
	if (this.top !== null) {
		this.top.next = node;
	} 
	this.top = node;
	if (this.bottom === null) {
		this.bottom = this.top;
	}
	this.length++;
	return this.length;
};

Stack.prototype.unshift = function(value) {
	var node = {previous: null, next: this.bottom, value: value};
	if (this.bottom !== null) {
		this.bottom.previous = node;
	} 
	this.bottom = node;
	if (this.top === null) {
		this.top = this.bottom;
	}
	this.length++;
	return this.length;
};

Stack.prototype.pop = function() {
	if (this.top) {
		var top = this.top;
		this.top = top.previous;
		if (this.top === null) {
			this.bottom = null;
		} else {
			this.top.next = null;
		}
		this.length--;
		return top.value;
	}
};

Stack.prototype.shift = function() {
	if (this.bottom) {
		var bottom = this.bottom;
		this.bottom = bottom.next;
		if (this.bottom === null) {
			this.top = null;
		} else {
			this.bottom.previous = null;
		}
		this.length--;
		return bottom.value;
	}
};

var testStack = function() {
	var a = [];
	var s = new Stack();
	var methods = ['pop', 'push', 'unshift', 'shift'];
	for (var i=0; i<10000; i++) {
		var method = methods[(Math.random()*methods.length) | 0];
		var arg = Math.random();
		var ar = a[method](arg);
		var sr = s[method](arg);
		if (ar !== sr) {
			console.log("screwed up", a, s, method, arg, ar, sr);
			throw ":(";
		}
		if (a.length !== s.length) {
			console.log("screwed up length", a, s, method, arg, a.length, s.length);
			throw ":(";
		}
	}
	console.log("finito");
};

var UndoStack = function(apply, getState) {
	this.maximumStackByteSize = 100e6;
	this.stackByteSize = 0;
	this.undoStack = new Stack();
	this.redoStack = new Stack();
	this.apply = apply;
	this.getState = getState;
	this.state = this.getState();
	this.stackByteSize += this.state.length;
};

UndoStack.prototype.addState = function() {
	if (this.redoStack.length > 0) {
		this.redoStack = [];
	}
	this.undoStack.push(this.state);
	this.state = this.getState();
	this.stackByteSize += this.state.length;
	while (this.stackByteSize > this.maximumStackByteSize && this.undoStack.length > 1) {
		var state = this.undoStack.shift();
		this.stackByteSize -= state.length;
	}
};

UndoStack.prototype.undo = function() {
	if (this.undoStack.length > 0) {
		this.redoStack.push(this.state);
		this.stackByteSize -= this.state.length;
		this.state = this.undoStack.pop();
		this.apply(this.state);
	}
};

UndoStack.prototype.redo = function() {
	if (this.redoStack.length > 0) {
		this.undoStack.push(this.state);
		this.state = this.redoStack.pop();
		this.stackByteSize += this.state.length;
		this.apply(this.state);
	}
};


window.ColorUtils = {

  colorToStyle : function(c) {
    return (
      'rgba('+Math.floor(c[0]*255)+
          ','+Math.floor(c[1]*255)+
          ','+Math.floor(c[2]*255)+
          ','+c[3]+')'
    );
  },

  colorToHex : function(c, noHash) {
    var r = Math.floor(255*Math.clamp(c[0], 0, 1));
    var g = Math.floor(255*Math.clamp(c[1], 0, 1));
    var b = Math.floor(255*Math.clamp(c[2], 0, 1));
    return [
      noHash ? '' : '#',
      r<16 ? '0' : '', r.toString(16),
      g<16 ? '0' : '', g.toString(16),
      b<16 ? '0' : '', b.toString(16)
    ].join('');
  },

  styleToColor : function(c) {
    var r=0,g=0,b=0,a=0;
    if (/^#/.test(c)) {
      r = parseInt(c.substring(1,3), 16) / 255;
      g = parseInt(c.substring(3,5), 16) / 255;
      b = parseInt(c.substring(5,7), 16) / 255;
      a = 1;
      if (c.length == 9)
        a = parseInt(c.substring(7,9), 16) / 255;
    } else if (/^rgba/.test(c)) {
      rgba = c.substring(5,c.length-1).split(",").map(parseFloat);
      r = rgba[0] / 255;
      g = rgba[1] / 255;
      b = rgba[2] / 255;
      a = rgba[3];
    } else if (/^rgb/.test(c)) {
      rgb = c.substring(4,c.length-1).split(",").map(parseFloat);
      r = rgb[0] / 255;
      g = rgb[1] / 255;
      b = rgb[2] / 255;
      a = 1.0;
    }
    return this.colorVec(r,g,b,a);
  },

  tween : function(a, b, f, dst) {
    var r = dst == null ? new this.colorVecType(a.length) : dst;
    for (var i=0; i<a.length; i++) {
      r[i] = a[i]*(1-f) + b[i]*f;
    }
    return r;
  },

  tweenColor : function(a, b, f, dst) {
    var c = this.tween(a,b,f, dst);
    return this.colorToStyle(c);
  },

  averageColor : function(imageData, dst) {
    var d = imageData.data;
    var r=0, g=0, b=0, a=0;
    for (var i=-1, dl=d.length-1; i<dl;) {
      r += d[++i];
      g += d[++i];
      b += d[++i];
      a += d[++i];
    }
    var l = d.length / 4;
    return this.colorVec( r/l, g/l, b/l, a/l, dst );
  },

  colorAt : function(ctx, x, y, radius, dst) {
    radius = radius || 1;
    var id = ctx.getImageData(x-(radius-1), y-(radius-1), 2*radius-1, 2*radius-1);
    var c = this.averageColor(id, dst);
    c[0] /= 255;
    c[1] /= 255;
    c[2] /= 255;
    c[3] /= 255;
    return c;
  },

  colorVecType : (typeof Float32Array === 'undefined' ? Array : Float32Array),

  colorVec : function(r,g,b,a,dst) {
    if (dst == null)
      dst = new this.colorVecType(4);
    dst[0]=r; dst[1]=g; dst[2]=b; dst[3]=a;
    return dst;
  },

  /**
    Converts an HSL color to its corresponding RGB color.

    @param h Hue in degrees [0 .. 360]
    @param s Saturation [0.0 .. 1.0]
    @param l Lightness [0.0 .. 1.0]
    @param dst Optional array to write the color into.
    @return The corresponding RGB color as [r,g,b]
    @type Array
    */
  hsl2rgb : function(h,s,l,dst) {
    var r,g,b;
    if (s == 0) {
      r=g=b=l;
    } else {
      var q = (l < 0.5 ? l * (1+s) : l+s-(l*s));
      var p = 2 * l - q;
      var hk = (h % 360) / 360;
      var tr = hk + 1/3;
      var tg = hk;
      var tb = hk - 1/3;
      if (tr < 0) tr++;
      if (tr > 1) tr--;
      if (tg < 0) tg++;
      if (tg > 1) tg--;
      if (tb < 0) tb++;
      if (tb > 1) tb--;
      if (tr < 1/6)
        r = p + ((q-p)*6*tr);
      else if (tr < 1/2)
        r = q;
      else if (tr < 2/3)
        r = p + ((q-p)*6*(2/3 - tr));
      else
        r = p;

      if (tg < 1/6)
        g = p + ((q-p)*6*tg);
      else if (tg < 1/2)
        g = q;
      else if (tg < 2/3)
        g = p + ((q-p)*6*(2/3 - tg));
      else
        g = p;

      if (tb < 1/6)
        b = p + ((q-p)*6*tb);
      else if (tb < 1/2)
        b = q;
      else if (tb < 2/3)
        b = p + ((q-p)*6*(2/3 - tb));
      else
        b = p;
    }
    return this.colorVec(r,g,b,1,dst);
  },

  /**
    Converts an HSV color to its corresponding RGB color.

    @param h Hue in degrees [0 .. 360]
    @param s Saturation [0.0 .. 1.0]
    @param v Value [0 .. 1.0]
    @return The corresponding RGB color as [r,g,b]
    @type Array
    */
  hsv2rgb : function(h,s,v,dst) {
    var r,g,b;
    if (s == 0) {
      r=g=b=v;
    } else {
      h = (h % 360)/60.0;
      var i = Math.floor(h);
      var f = h-i;
      var p = v * (1-s);
      var q = v * (1-s*f);
      var t = v * (1-s*(1-f));
      switch (i) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        case 5:
          r = v;
          g = p;
          b = q;
          break;
      }
    }
    return this.colorVec(r,g,b,1,dst);
  },

  hsva2rgba : function(h,s,v,a,dst) {
    var rgb = this.hsv2rgb(h,s,v,dst);
    rgb[3] = a;
    return rgb;
  },

  rgb2cmy : function(r,g,b,dst) {
    return this.colorVec(1-r, 1-g, 1-b, 1, dst);
  },

  cmy2rgb : function(c,m,y,dst) {
    return this.colorVec(1-c, 1-m, 1-y, 1, dst);
  },

  rgba2cmya : function(r,g,b,a,dst) {
    return this.colorVec(1-r, 1-g, 1-b, a, dst);
  },

  cmya2rgba : function(c,m,y,a,dst) {
    return this.colorVec(1-c, 1-m, 1-y, a, dst);
  },

  cmy2cmyk : function(c,m,y,dst) {
    var k = Math.min(c,m,y);
    if (k == 1)
      return this.colorVec(0,0,0,1,dst);
    var k1 = 1-k;
    return this.colorVec((c-k)/k1, (m-k)/k1, (y-k)/k1, k,dst);
  },

  cmyk2cmy : function(c,m,y,k,dst) {
    var k1 = 1-k;
    return this.colorVec(c*k1+k, m*k1+k, y*k1+k, 1, dst);
  },

  cmyk2rgb : function(c,m,y,k,dst) {
    var cmy = this.cmyk2cmy(c,m,y,k,dst);
    return this.cmy2rgb(cmy[0], cmy[1], cmy[2], cmy);
  },

  rgb2cmyk : function(r,g,b,dst) {
    var cmy = this.rgb2cmy(r,g,b,dst);
    return this.cmy2cmyk(cmy[0], cmy[1], cmy[2], cmy);
  },

  rgba2hsva : function(r,g,b,a,dst) {
    var h=0,s=0,v=0;
    var mini = Math.min(r,g,b);
    var maxi = Math.max(r,g,b);
    var v=maxi;
    var delta = maxi-mini;
    if (maxi > 0) {
      s = delta/maxi;
      if (delta == 0)
        h = 0;
      else if (r == maxi)
        h = (g-b)/delta;
      else if (g == maxi)
        h = 2+(b-r)/delta;
      else
        h = 4+(r-g)/delta;
      h *= 60;
      if (h < 0)
        h += 360;
    }
    return this.colorVec(h,s,v,a,dst);
  },

  rgb2hsv : function(r,g,b,dst) {
    return this.rgba2hsva(r,g,b,1,dst);
  }

  // rgb2yiqMatrix : mat3.create([
  //   0.299, 0.587, 0.114,
  //   0.596, -0.275, -0.321,
  //   0.212, -0.523, 0.311
  // ]),
  // rgba2yiqa : function(r,g,b,a,dst) {
  //   return mat3.multiplyVec3(this.rgb2yiqMatrix, this.colorVec(r,g,b,a,dst));
  // },

  // rgb2yiq : function(r,g,b,dst) {
  //   return this.rgba2yiqa(r,g,b,1,dst);
  // },

  // yiq2rgbMatrix : mat3.create([
  //   1, 0.956, 0.621,
  //   1, -0.272, -0.647,
  //   1, -1.105, 1.702
  // ]),
  // yiqa2rgba : function(y,i,q,a,dst) {
  //   return mat3.multiplyVec3(this.yiq2rgbMatrix, this.colorVec(y,i,q,a,dst));
  // },

  // yiq2rgb : function(y,i,q,dst) {
  //   return this.yiqa2rgba(y,i,q,1,dst);
  // },

  // rgb2xyzMatrix : mat3.create([
  //   3.240479, -1.537150, -0.498535,
  //   -0.969256, 1.875992, 0.041556,
  //   0.055648, -0.204043, 1.057311
  // ]),
  // rgba2xyza : function(r,g,b,a,dst) {
  //   return mat3.multiplyVec3(this.rgba2xyzaMatrix, this.colorVec(r,g,b,a,dst));
  // },
  // rgb2xyz : function(r,g,b,dst) {
  //   return this.rgba2xyza(r,g,b,1,dst);
  // },

  // xyz2rgbMatrix : mat3.create([
  //   0.412453, 0.357580, 0.180423,
  //   0.212671, 0.715160, 0.072169,
  //   0.019334, 0.119193, 0.950227
  // ]),
  // xyza2rgba : function(x,y,z,a,dst) {
  //   return mat3.multiplyVec3(this.xyz2rgbMatrix, this.colorVec(x,y,z,a,dst));
  // },
  // xyz2rgb : function(x,y,z,dst) {
  //   return this.xyza2rgba(x,y,z,1,dst);
  // },

  // laba2xyza : function(l,a,b,xn,yn,zn,alpha,dst) {
  //   p = (l + 16.0) / 116.0;
  //   return this.colorVec(
  //     xn * Math.pow(p + a / 500.0, 3),
  //     yn * p*p*p,
  //     zn * Math.pow(p - b / 200.0, 3),
  //     alpha, dst
  //   );
  // },
  // lab2xyz : function(l,a,b,xn,yn,zn,dst) {
  //   return this.laba2xyza(l,a,b,xn,yn,zn,1,dst);
  // },
  // xyza2laba : function(x,y,z,xn,yn,zn,a,dst) {
  //   var f = function(t) {
  //     return (t > 0.008856) ? Math.pow(t,(1.0/3.0)) : (7.787 * t + 16.0/116.0);
  //   };
  //   return this.colorVec(
  //     ((y/yn > 0.008856) ? 116.0 * Math.pow(y/yn, 1.0/3.0) - 16.0 : 903.3 * y/yn),
  //     500.0 * ( f(x/xn) - f(y/yn) ),
  //     200.0 * ( f(y/yn) - f(z/zn) ),
  //     a, dst
  //   );
  // },
  // xyz2lab : function(x,y,z,xn,yn,zn,dst) {
  //   return this.xyza2laba(x,y,z,xn,yn,zn,1,dst);
  // },

  // laba2rgba : function(l,a,b,xn,yn,zn,A,dst) {
  //   var xyza = this.laba2xyza(l,a,b,xn,yn,zn,A,dst)
  //   return this.xyza2rgba(xyza[0], xyza[1], xyza[2], xyza[3], xyza);
  // },
  // lab2rgb : function(l,a,b,xn,yn,zn,dst) {
  //   return this.laba2rgba(l,a,b,xn,yn,zn,1,dst);
  // },

  // rgba2laba : function(r,g,b,a,xn,yn,zn,dst) {
  //   var xyza = this.rgba2xyza(r,g,b,a,dst);
  //   return this.xyza2laba(xyza[0], xyza[1], xyza[2], xn,yn,zn, xyza[3], xyza);
  // },
  // rgb2lab : function(r,g,b,xn,yn,zn,dst) {
  //   return this.rgba2labal(r,g,b,xn,yn,zn,1,dst);
  // },

  // rgb2yuvMatrix : mat3.create([
  //   0.299, 0.587, 0.144,
  //   -0.159, -0.332, 0.050,
  //   0.500, -0.419, -0.081
  // ]),
  // rgba2yuva : function(r,g,b,a,dst) {
  //   return mat3.multiplyVec3(this.rgb2yuvMatrix, this.colorVec(r,g,b,a,dst));
  // },
  // rgb2yuv : function(r,g,b,dst) {
  //   return this.rgba2yuva(r,g,b,1,dst);
  // },

  // yuva2rgba : function(y,u,v,a,dst) {
  //   return this.colorVec(
  //     y + (1.4075 * (v - 128)),
  //     y - (0.3455 * (u - 128) - (0.7169 * (v - 128))),
  //     y + (1.7790 * (u - 128)),
  //     a, dst
  //   );
  // },
  // yuv2rgb : function(y,u,v,dst) {
  //   return this.yuva2rgba(y,u,v,1,dst);
  // }

};

window.ColorMixer = function(container, width, height, callback) {
	for (var i in ColorUtils) {
		this[i] = ColorUtils[i];
	}
	this.initialize(container, width, height, callback);
};

ColorMixer.prototype = {
  hue : 0,
  saturation : 0,
  value : 0,

  initialize: function(container, width, height, callback) {
    var self = this;
    this.callback = callback;

    var pixelRatio = window.devicePixelRatio;
    this.pixelRatio = pixelRatio;

    var widget = document.createElement('div');
    widget.style.position = 'relative';
    widget.style.padding = '0px';
    this.widget = widget;
    container.appendChild(this.widget);

    this.canvas = document.createElement('canvas');
    this.canvas.width = (width-8) * pixelRatio;
    this.canvas.height = (height-8) * pixelRatio;
    this.canvas.style.width = (width-8) + 'px';
    this.canvas.style.height = (height-8) + 'px';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(pixelRatio, pixelRatio);

    this.hueCanvas = document.createElement('canvas');
    this.hueCanvas.width = 30 * pixelRatio;
    this.hueCanvas.height = (height-8) * pixelRatio;
    this.hueCanvas.style.width = '30px';
    this.hueCanvas.style.height = (height-8) + 'px';
    this.hueCanvas.style.position = 'absolute';
    this.hueCanvas.style.top = '4px';
    this.hueCanvas.style.left = (width+4) + 'px';
    widget.appendChild(this.hueCanvas);

    this.svWidget = document.createElement('div');
    this.svWidget.style.position = 'absolute';
    this.svWidget.style.left = '4px';
    this.svWidget.style.top = '4px';

    this.canvas.style.position = 'absolute';
    this.canvas.style.boxShadow = '0px 0px 4px rgba(0,0,0,0.3)';
    this.canvas.style.top = this.canvas.style.left = '0px';
    this.svWidget.appendChild(this.canvas);

    widget.appendChild(this.svWidget);

    this.hueCtx = this.hueCanvas.getContext('2d');
    this.hueCtx.scale(pixelRatio, pixelRatio);

    this.hueCanvas.update = function(ev) {
      if (this.down) {
        var bbox = this.getBoundingClientRect();
        var xy = {x: ev.clientX-bbox.left, y: ev.clientY-bbox.top};
        var h = self.hueAtMouseCoords(xy);
        self.setHue(h, true);
      }
    };

    this.canvas.update = function(ev) {
      if (this.down) {
        var bbox = this.getBoundingClientRect();
        var xy = {x: ev.clientX-bbox.left, y: ev.clientY-bbox.top};
        var x = Math.clamp(xy.x, 0, width-9);
        var y = Math.clamp(xy.y, 0, height-9);
        self.setSaturation(x/(width-9), false);
        self.setValue(1-(y/(height-9)), true);
      }
    };

    var addEventListeners = function(el) {
      el.addEventListener('touchstart', function(ev) {
        this.down = true;
        ev.preventDefault();
        this.update(ev.touches[0]);
      }, false);
      el.addEventListener('touchmove', function(ev) { el.update(ev.touches[0]); ev.preventDefault(); }, false);
      el.addEventListener('touchend', function(ev) { this.down = false; }, false);
      el.addEventListener('touchcancel', function(ev) { this.down = false; }, false);

      el.addEventListener('mousedown', function(ev) {
        this.down = true;
        ev.preventDefault();
        this.update(ev);
      }, false);
      window.addEventListener('mousemove', function(ev) { el.update(ev); if (el.down) { ev.preventDefault(); } }, false);
      window.addEventListener('mouseup', function(ev) { el.down = false; }, false);
    };

    addEventListeners(this.canvas);
    addEventListeners(this.hueCanvas);

    var w = this.ctx.createLinearGradient(0,0,0,height-9);
    w.addColorStop(0, 'rgba(0,0,0,0)');
    w.addColorStop(1, 'rgba(0,0,0,1)');
    this.valueGradient = w;
    this.currentColor = this.colorVec(-1,0,0,1);
    this.setHue(0);
  },

  signalChange : function() {
    this.callback(this.hsva2rgba(this.hue, this.saturation, this.value, 1));
  },

  set : function(c, signal) {
  	return this.setColor(c, signal);
  },

  setColor : function(c, signal) {
    var cc = this.currentColor;
    var eq = !cc || (
      (Math.floor(c[0]*255) === Math.floor(cc[0]*255)) &&
      (Math.floor(c[1]*255) === Math.floor(cc[1]*255)) &&
      (Math.floor(c[2]*255) === Math.floor(cc[2]*255))
    );
    if (!eq) {
      var hsv = this.rgb2hsv(c[0], c[1], c[2]);
      if (hsv[2] > 0 && hsv[1] > 0) {
        this.setHue(hsv[0], false);
      }
      this.setSaturation(hsv[1], false);
      this.setValue(hsv[2], false);
      this.currentColor = this.colorVec(c[0],c[1],c[2], 1);
    }
    this.requestRedraw();
    if (signal) {
      this.signalChange();
    }
  },

  setSaturation : function(s, signal) {
    this.saturation = s;
    this.requestRedraw();
    if (signal) {
      this.currentColor = this.hsv2rgb(this.hue, this.saturation, this.value);
      this.signalChange();
    }
  },

  setValue : function(s, signal) {
    this.value = s;
    this.requestRedraw();
    if (signal) {
      this.currentColor = this.hsv2rgb(this.hue, this.saturation, this.value);
      this.signalChange();
    }
  },

  setHue : function(hue, signal) {
    this.hue = hue % 360;
    if (this.hue < 0) this.hue += 360;
    this.requestRedraw();
    if (signal) {
      this.currentColor = this.hsv2rgb(this.hue, this.saturation, this.value);
      this.signalChange();
    }
  },

  hueAtMouseCoords : function(xy) {
    var h = this.hueCanvas.height / this.pixelRatio;
    var r = Math.clamp(xy.y / h, 0, 1);
    return (1-r) * 360;
  },

  requestRedraw : function() {
    this.needRedraw = true;
    if (this.app)
      this.app.requestRedraw();
  },

  updateDisplay : function() {
    this.redrawHueCanvas();
    this.redrawSVCanvas();
  },

  redraw : function() {
    if (this.needRedraw) {
      this.updateDisplay();
      this.needRedraw = false;
    }
  },

  redrawHueCanvas : function() {
    var hc = this.hueCtx;
    hc.save();
    var w = this.hueCanvas.width / this.pixelRatio;
    var h = this.hueCanvas.height / this.pixelRatio;
    var nearestHue = 0;
    var nearestHueD = 1/0;
    hc.clearRect(0,0,w,h);
    for (var y=0; y<h; y++) {
      var hue = (1 - y/h) * 360;
      var rgb = this.hsv2rgb(hue, 1,1);
      var hueD = Math.abs(hue - this.hue);
      if (hueD < nearestHueD) {
      	nearestHue = y;
      	nearestHueD = hueD;
      }
      rgb[3] = 1;
      hc.fillStyle = this.colorToStyle(rgb);
      hc.fillRect(0, y, w, 1);
    }
    hc.fillStyle = 'black';
    hc.fillRect(0, nearestHue, w, 1);
    hc.restore();
  },

  redrawSVCanvas : function() {
    var w = this.canvas.width/this.pixelRatio;
    var h = this.canvas.height/this.pixelRatio;
    var rgb = this.hsva2rgba(this.hue, 1, 1, 1);
    var g = this.ctx.createLinearGradient(0, 0, w-1, 0);
    g.addColorStop(0, 'white');
    g.addColorStop(1, this.colorToStyle(rgb));
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0,0,w,h);
    this.ctx.fillStyle = this.valueGradient;
    this.ctx.fillRect(0,0,w,h);

    this.ctx.beginPath();
    this.ctx.arc( this.saturation * (this.canvas.width/this.pixelRatio-1), (1-this.value)*(this.canvas.height/this.pixelRatio-1), 8, 0, Math.PI*2, true);
    this.ctx.strokeStyle = 'white';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc( this.saturation * (this.canvas.width/this.pixelRatio-1), (1-this.value)*(this.canvas.height/this.pixelRatio-1), 7, 0, Math.PI*2, true);
    this.ctx.strokeStyle = 'black';
    this.ctx.stroke();
  }
};