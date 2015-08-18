
var addLeafMesh = function(mesh, x, y) {
	var height = 1 + Math.random();
	var aoff = Math.random() * Math.PI*2;
	for (var i=0; i<5; i++) {
		var r0 = height*(i/5);
		var r1 = height*(i+1)/5;
		var a0 = aoff+(Math.PI*2/5) * 0.5*(1-(1-i/5));
		var a1 = aoff+(Math.PI*2/5) * 0.5*(1+(1-i/5));
		var a2 = aoff+(Math.PI*2/5) * 0.5*(1-(1-(i+1)/5));
		var a3 = aoff+(Math.PI*2/5) * 0.5*(1+(1-(i+1)/5));

		var y0 = y+i*height;
		var y1 = y+(i+1)*height;
		var x0 = Math.cos(a0)*r0, x1 = Math.cos(a1)*r0;
		var x2 = Math.cos(a2)*r1, x3 = Math.cos(a3)*r1;
		var z0 = Math.sin(a0)*r0, z1 = Math.sin(a1)*r0;
		var z2 = Math.sin(a2)*r1, z3 = Math.sin(a3)*r1;
		mesh.push(
			x0, y0, z0,
			x2, y1, z2,
			x1, y0, z1,

			x2, y1, z2,
			x3, y1, z3,
			x1, y0, z1
		);
	}
};

var addSegmentMesh = function(mesh, x, y, height, bottomRadius, topRadius) {
	addLeafMesh(mesh, x, y);
	for (var i=0; i<5; i++) {
		var y0 = y+i*height; 
		var y1 = y+(i+1)*height;
		var r0 = bottomRadius * (1-i/5) + topRadius * (i/5);
		var r1 = bottomRadius * (1-(i+1)/5) + topRadius * ((i+1)/5);
		for (var a=0; a<5; a++) {
			var a0 = 0.3+(Math.PI*2/5) * a;
			var a1 = 0.3+(Math.PI*2/5) * (a+1);
			var x0 = Math.cos(a0);
			var x1 = Math.cos(a1);
			var z0 = Math.sin(a0);
			var z1 = Math.sin(a1);
			mesh.push(
				x0*r0, y0, z0*r0,
				x0*r1, y1, z0*r1,
				x1*r0, y0, z1*r0,

				x0*r1, y1, z0*r1,
				x1*r1, y1, z1*r1,
				x1*r0, y0, z1*r0
			);
		}
	}
};

var addCornMesh = function(mesh, x, y) {
	for (var j=0; j<16; j++) {
		var yoff = Math.floor(j / 2) + 0.3*(0.5 - Math.random());
		var aoff = Math.PI * (j%2) + Math.random();
		var xoff = 0.1*(-0.5 + (j%2))+0.3*(0.5-Math.random());
		var y0 = yoff*0.2-0.1+y;
		var y1 = y0 + 0.1;
		var y2 = y1 + 0.1;
		var r = 0.1;
		for (var a=0; a<4; a++) {
			var a0 = (Math.PI*2/4) * a + aoff;
			var a1 = (Math.PI*2/4) * (a+1) + aoff;
			var x0 = xoff+Math.cos(a0) * r;
			var x1 = xoff+Math.cos(a1) * r;
			var z0 = Math.sin(a0) * r;
			var z1 = Math.sin(a1) * r;
			mesh.push(
				xoff, y0, 0,
				x0, y1, z0,
				x1, y1, z1,

				x0, y1, z0,
				xoff, y2, 0,
				x1, y1, z1
			);
		}
	}
};



onmessage = function() {
	var r = 25;

	var nmesh = [];
	var nidx = 0;
	var stalks = [];
	var stalkIndex = 0;

	for (var i = -r*1.5; i <= r*1.5; i++) {
		for (var j = -r; j <= r; j++) {
			var ox = i*4 + Math.random()*4;
			var oz = -15*1.5 + j*4 + Math.random()*4;
			var oy = Math.random() * 0.5 + 0.5;
			var mesh = [];

			var segs = 1+Math.random()*2+Math.pow(Math.random(), 8.0)*3.0;
			var segCount = Math.ceil(segs);
			var y = 0;

			for (var s = 0; s < segCount; s++) {
				var seg = (segs - s);
				var segmentLength = Math.max(0, seg);
				segmentLength = Math.min(1, segmentLength);
				segmentLength *= segs / 4;
				var bottomRadius = 0.1 * (1.0 - s/segCount);
				var topRadius = 0.1 * (1.0 - (s+1)/segCount);
				addSegmentMesh(mesh, 0, y, segmentLength, bottomRadius, topRadius);
				y += segmentLength*5;
			}
			if (segs > 3) {
				addCornMesh(mesh, 0, y);
			}
			for (var k = 0; k < mesh.length; k+=3) {
				nmesh[nidx++] = mesh[k+0] + ox;
				nmesh[nidx++] = mesh[k+1];// * oy;
				nmesh[nidx++] = mesh[k+2] + oz;
				stalks.push(stalkIndex);
			}
			stalkIndex++;
		}
	}

	var normals = [];

	var u0, u1, u2;
	var v0, v1, v2;
	var w0, w1, w2;

	for (var i = 0; i < nmesh.length; i += 9) {

		u0 = nmesh[i+3] - nmesh[i];
		u1 = nmesh[i+4] - nmesh[i+1];
		u2 = nmesh[i+5] - nmesh[i+2];

		v0 = nmesh[i+6] - nmesh[i];
		v1 = nmesh[i+7] - nmesh[i+1];
		v2 = nmesh[i+8] - nmesh[i+2];

		w0 = (u1*v2 - u2*v1);
		w1 = (u2*v0 - u0*v2);
		w2 = (u0*v1 - u1*v0);

		var id = 1 / Math.sqrt(w0*w0 + w1*w1 + w2*w2);

		w0 *= id;
		w1 *= id;
		w2 *= id;

		normals.push(w0, w1, w2,  w0, w1, w2,  w0, w1, w2)
	}


	var vertices = new Float32Array(nmesh);
	var normalArray = new Float32Array(normals);
	var stalksArray = new Float32Array(stalks);

	postMessage({vertices: vertices, normals: normalArray, stalks: stalksArray}, [vertices.buffer, normalArray.buffer, stalksArray.buffer]);
};
