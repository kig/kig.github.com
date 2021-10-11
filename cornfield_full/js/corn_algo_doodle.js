var hiDpi = true || ((window.devicePixelRatio || 1) > 1);

if (hiDpi) {

	var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, premultipliedAlpha: true});
	var bgRenderer = new THREE.WebGLRenderer({antialias: false});
	document.body.appendChild(bgRenderer.domElement);
	document.body.appendChild(renderer.domElement);
	bgRenderer.setPixelRatio(0.5 * (window.devicePixelRatio || 1));
	bgRenderer.setSize(window.innerWidth, window.innerHeight);

	renderer.setPixelRatio(window.devicePixelRatio || 1);

} else {
	var renderer = new THREE.WebGLRenderer({antialias: true});
	var bgRenderer = renderer;
	document.body.appendChild(renderer.domElement);
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 0.0);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 35, renderer.domElement.width / renderer.domElement.height, 1, 10000 );
camera.position.z = 120;
camera.position.y = 12;
var zero = new THREE.Vector3(0,24,20);
camera.lookAt(zero);
scene.add(camera);

var bgVert = document.querySelector('#bg-vert').textContent;
var bgFrag = document.querySelector('#bg-frag').textContent;
var cornFragSimple = document.querySelector('#corn-frag-simple').textContent;

var id = new Uint8Array(256*256*4);
id.width=256;
id.height=256;
for (var y=0; y<256; y++) {
	for (var x=0; x<256; x++) {
		var off = (y*256 + x) | 0;
		var off2 = (((y+17) % 256)*256 + ((x+37) % 256)) | 0;
		var v = (256 * Math.random()) | 0;
		id[off*4] = id[off2*4+1] = v;
		id[off*4+2] = (256 * Math.random()) | 0;
		id[off*4+3] = (256 * Math.random()) | 0;
	}
}
var tex = new THREE.DataTexture(id, id.width, id.height,
	THREE.RGBAFormat, THREE.UnsignedByteType,
	THREE.Texture.DEFAULT_MAPPING,
	THREE.RepeatWrapping, THREE.RepeatWrapping
);
tex.flipY = false;
tex.needsUpdate = true;

var bgScene = new THREE.Scene();
var shaderMat = new THREE.ShaderMaterial({
	attributes: {},
	uniforms: {
		ufGlobalTime: { type: "f", value: 0 },
		uv2Resolution: { type: "v2", value: new THREE.Vector2(bgRenderer.domElement.width, bgRenderer.domElement.height) },
		um4CameraMatrix: { type: "m4", value: new THREE.Matrix4() },
		uv3CameraPosition: { type: "v3", value: new THREE.Vector3() },
		ufSunPosition: { type: "f", value: 0 },
		ufCloudCover: { type: "f", value: 0 },
		ufRainAmount: { type: "f", value: 0 },
		ufWindDirection: { type: "f", value: 0 },
		ufPixelRatio: { type: "f", value: bgRenderer.domElement.width / renderer.domElement.width },
		ufWindStrength: { type: "f", value: 0 },
		usRandomTex: { type: "t", value: tex }
	},
	depthTest: false,
	depthWrite: false,
	fog: false,
	vertexShader: bgVert,
	fragmentShader: bgFrag
});
var bgCamera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1);
bgScene.add(bgCamera);
var bgPlane = new THREE.Mesh(
	new THREE.PlaneBufferGeometry(2, 2, 1, 1), shaderMat
);
bgScene.add(bgPlane);

simpleCornMat = cornShaderMat.clone();
simpleCornMat.fragmentShader = cornFragSimple;

scene.add(cornMesh);
scene.add(rainMesh);
scene.add(birds);

var addHeight = (/(iPhone|iPad|iPod).*AppleWebKit/.test(navigator.userAgent) && navigator.standalone) ? 20 : 0;
document.getElementById('weather-data').style.marginTop = addHeight + 'px';

window.onresize = function() {
	bgRenderer.setSize(document.documentElement.offsetWidth, document.documentElement.offsetHeight+addHeight);
	renderer.setSize(document.documentElement.offsetWidth, document.documentElement.offsetHeight+addHeight);
	camera.aspect = renderer.domElement.width / renderer.domElement.height;
	camera.updateProjectionMatrix();
	shaderMat.uniforms.uv2Resolution.value.x = bgRenderer.domElement.width;
	shaderMat.uniforms.uv2Resolution.value.y = bgRenderer.domElement.height;
	shaderMat.uniforms.ufPixelRatio.value = bgRenderer.domElement.width / renderer.domElement.width;
};

var clicked = false;
window.onclick = function(ev) {
	clicked = true;
}

var matrix = new THREE.Matrix4();

for (var i in shaderMat.uniforms) {
	simpleCornMat.uniforms[i] =
	cornShaderMat.uniforms[i] = shaderMat.uniforms[i];
}

simpleCornMat.uniforms.ufGlobalTime = cornShaderMat.uniforms.ufGlobalTime = rainShaderMat.uniforms.ufGlobalTime = shaderMat.uniforms.ufGlobalTime;

simpleCornMat.uniforms.ufWindDirection = cornShaderMat.uniforms.ufWindDirection = rainShaderMat.uniforms.ufWindDirection;
simpleCornMat.uniforms.ufWindStrength = cornShaderMat.uniforms.ufWindStrength = rainShaderMat.uniforms.ufWindStrength;
shaderMat.uniforms.ufRainAmount = rainShaderMat.uniforms.ufRainAmount;

scene.add(particles);

renderer.autoClear = false;
bgRenderer.autoClear = false;

var animationTime = 0;

var lastTime = Date.now();
var frameTimes = [];
var slow = false;
var frame = 0;

var lastHeight = document.documentElement.offsetHeight;

var tick = function() {
	if (lastHeight !== document.documentElement.offsetHeight) {
		onresize();
		lastHeight = document.documentElement.offsetHeight;
	}
	frame++;
	matrix.multiplyMatrices( camera.matrixWorld, matrix.getInverse( camera.projectionMatrix ) );

	shaderMat.uniforms.ufGlobalTime.value = animationTime;
	shaderMat.uniforms.um4CameraMatrix.value = matrix;
	shaderMat.uniforms.uv3CameraPosition.value = camera.position;

	setWeather();
	if (!slow) {
		updateParticles();
		birdsTick();
	}
	if (cornMesh.children[0]) {
		cornMesh.children[0].material = slow ? simpleCornMat : cornShaderMat;
	}
	impactTick();
	birds.visible = !slow;
	// cornMesh.visible = !slow;
	particles.visible = !slow;

	camera.lookAt(zero);

	animationTime += 0.016;
	bgRenderer.clear();
	bgRenderer.render(bgScene, bgCamera);
	if (bgRenderer !== renderer) {
		renderer.clear();
	}
	renderer.render(scene, camera);
	requestAnimationFrame(tick);
	clicked = false;

	if (frame < 200) {
		var elapsed = Date.now() - lastTime; 
		lastTime = Date.now();
		frameTimes.push(elapsed);
		var fastFrames = 0;
		var slowFrames = 0;
		for (var i=0; i<frameTimes.length; i++) {
			if (frameTimes[i] > 40) {
				slowFrames++;
			}
		}
		// slow = (slowFrames/frameTimes.length > 0.5);
		if (frameTimes.length > 100) {
			frameTimes = frameTimes.splice(0,50);
		}
	}
};

tick();
var fullscreenButton = document.getElementById('fullscreen');
if (fullscreenButton && (document.exitFullscreen||document.webkitExitFullscreen||document.webkitExitFullScreen||document.mozCancelFullScreen||document.msExitFullscreen)) {
	fullscreenButton.onclick = function() {
		var d = document;
		if (d.fullscreenElement||d.webkitFullscreenElement||d.webkitFullScreenElement||d.mozFullScreenElement||d.msFullscreenElement) {
			(d.exitFullscreen||d.webkitExitFullscreen||d.webkitExitFullScreen||d.mozCancelFullScreen||d.msExitFullscreen).call(d);
		} else {
			var e = document.body;
			(e.requestFullscreen||e.webkitRequestFullscreen||e.webkitRequestFullScreen||e.mozRequestFullScreen||e.msRequestFullscreen).call(e);
		}
	}
	if (window.navigator.standalone === true) {
		fullscreenButton.style.opacity = '0';
	}
} else if (fullscreenButton) {
	fullscreenButton.style.opacity = '0';
}
