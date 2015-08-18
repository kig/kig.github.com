var cornMesh = new THREE.Object3D();

var cornVert = document.querySelector('#corn-vert').textContent;
var cornFrag = document.querySelector('#corn-frag').textContent;

var cornShaderMat = new THREE.ShaderMaterial({
	attributes: {
		afStalkIndex: { type: "float" }
	},
	uniforms: {
		ufGlobalTime: { type: "f", value: 0 },
		uv2Resolution: { type: "v2", value: new THREE.Vector2(1,1) },
		um4CameraMatrix: { type: "m4", value: new THREE.Matrix4() },
		uv3CameraPosition: { type: "v3", value: new THREE.Vector3() },
		ufWindStrength: { type: "f", value: 0 },
		ufWindDirection: { type: "f", value: 0 },
		ufGrassHeight: { type: "f", value: 1 },
		ufImpulse: { type: "f", value: 0 }
	},
	transparent: true,
	//depthTest: false,
	//depthWrite: false,
	fog: false,
	vertexShader: cornVert,
	fragmentShader: cornFrag
});

var createCornFieldModel = function() {
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
	var tmp = new THREE.Vector3();
	var tmp2 = new THREE.Vector3();
	var v0 = new THREE.Vector3();
	var v1 = new THREE.Vector3();
	var v2 = new THREE.Vector3();
	for (var i = 0; i < nmesh.length; i += 9) {
		v0.set(nmesh[i], nmesh[i+1], nmesh[i+2]);
		v1.set(nmesh[i+3], nmesh[i+4], nmesh[i+5]);
		v2.set(nmesh[i+6], nmesh[i+7], nmesh[i+8]);
		tmp.subVectors(v1, v0);
		tmp2.subVectors(v2, v0);
		tmp.cross(tmp2);
		tmp.normalize();
		normals.push(tmp.x, tmp.y, tmp.z);
		normals.push(tmp.x, tmp.y, tmp.z);
		normals.push(tmp.x, tmp.y, tmp.z);
	}


	var vertices = new Float32Array(nmesh);
	var normalArray = new Float32Array(normals);
	var stalksArray = new Float32Array(stalks);

	return {vertices: vertices, normals: normalArray, stalks: stalksArray};
};

var populateCornFieldModel = function(data) {
	var geo = new THREE.BufferGeometry();
	geo.addAttribute('position', new THREE.BufferAttribute(data.vertices,3));
	geo.addAttribute('normal', new THREE.BufferAttribute(data.normals,3));
	geo.addAttribute('afStalkIndex', new THREE.BufferAttribute(data.stalks, 1));

	cornMesh.add(new THREE.Mesh(geo, cornShaderMat));
};

if (window.Worker) {

	window.cornWorker = new Worker('js/corn_worker.js');

	window.cornWorker.postMessage('createCornFieldModel');

	window.cornWorker.onmessage = function(ev) {
		cornShaderMat.uniforms.ufGrassHeight.value = 0;
		grassHeight = 1;
		if (window.birds) {
			setTimeout(function() {
				window.birds.visible = true;
			}, 400);
		}
		populateCornFieldModel(ev.data);
	};

} else {

	populateCornFieldModel(createCornFieldModel());

}

