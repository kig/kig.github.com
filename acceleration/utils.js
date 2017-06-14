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
