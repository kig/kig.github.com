var rainVert = document.querySelector('#rain-vert').textContent;
var rainFrag = document.querySelector('#rain-frag').textContent;

var rainVerts = [];
var rainIndexes = [];
for (var z = 0; z < 10; z++) {
	for (var i = 0; i < 300; i++) {
		rainVerts.push(
			-1, -1, 0,
			1, -1, 0,
			-1, 1, 0,

			-1, 1, 0,
			1, -1, 0,
			1, 1, 0
		);
		for (var j=0; j<6; j++) {
			rainIndexes.push(z*300 + i);
		}
	}
}

var rainGeo = new THREE.BufferGeometry();
rainGeo.addAttribute('position', new THREE.BufferAttribute(new Float32Array(rainVerts), 3));
rainGeo.addAttribute('afDropIndex', new THREE.BufferAttribute(new Float32Array(rainIndexes), 1));

var rainShaderMat = new THREE.ShaderMaterial({
	attributes: {
		afDropIndex: { type: "float" }
	},
	uniforms: {
		ufGlobalTime: { type: "f", value: 0 },
		ufRainAmount: { type: "f", value: 0 },
		ufWindDirection: { type: "f", value: 0 },
		ufWindStrength: { type: "f", value: 0 }
	},
	depthTest: false,
	depthWrite: false,
	transparent: true,
	blending: THREE.AdditiveBlending,
	fog: false,
	vertexShader: rainVert,
	fragmentShader: rainFrag
});

var rainMesh = new THREE.Mesh(rainGeo, rainShaderMat);
