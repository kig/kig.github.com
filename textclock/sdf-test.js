// test sdf rendering

global.THREE = require('three')
var createText = require('three-bmfont-text')
var SDFShader = require('three-bmfont-text/shaders/sdf')
var loadFont = require('load-bmfont')

var loadFontImage = function (opt, cb) {
  loadFont(opt.font, function (err, font) {
    if (err) throw err
    new THREE.TextureLoader().load(opt.image, function (tex) {
      cb(font, tex)
    })
  })
};

// load up a 'fnt' and texture
loadFontImage({
  font: 'fnt/DejaVu-sdf.fnt',
  image: 'fnt/DejaVu-sdf.png'
}, start)

function start(font, texture) {
	console.log('loaded ok', font, texture);

	var app = {
		renderer: new THREE.WebGLRenderer({antialias: true, alpha: false}),
		scene: new THREE.Scene(),
		camera: new THREE.PerspectiveCamera(35, 1, 1, 1000)
	};
	window.onresize = function() {
		app.renderer.setSize(window.innerWidth, window.innerHeight);
		app.camera.aspect = window.innerWidth / window.innerHeight;
		app.camera.updateProjectionMatrix();
	};
	window.onresize();

	app.renderer.setClearColor(0xEEEEEE, 1.0);
	document.body.appendChild(app.renderer.domElement);
	app.camera.position.set(50,50,-50).multiplyScalar(0.5);
	var target = new THREE.Vector3(0,0,0);
	app.camera.lookAt(target);
	app.scene.add(app.camera);

	var maxAni = app.renderer.getMaxAnisotropy()

	// setup our texture with some nice mipmapping etc
	texture.needsUpdate = true
	texture.minFilter = THREE.LinearMipMapLinearFilter
	texture.magFilter = THREE.LinearFilter
	texture.generateMipmaps = true
	texture.anisotropy = maxAni

	// here we use 'three-bmfont-text/shaders/sdf'
	// to help us build a shader material
	var material = new THREE.RawShaderMaterial(SDFShader({
		map: texture,
		side: THREE.DoubleSide,
		transparent: true,
		color: 0x0,
		depthWrite: false
	}))

	var texts = [];
	var off = 0;
	var bigGeo = createText({text: '', font: font});
	var bigObj = new THREE.Mesh(bigGeo, material);
	var updateTexts = function() {
		var len = 20;
		var totalLen = 1000;
		off = (off + len) % totalLen;
		for (var i=0+off; i<len+off; i++) {
			var copy = new Date().toLocaleString();

			var text = texts[i];
			if (!text) {
				// create our text geometry
				var geom = createText({
					text: '', // the string to render
					font: font // the bitmap font definition
					// width: 1000 // optional width for word-wrap
				})

				text = new THREE.Mesh(geom, material)
				// textAnchor.add(text)
				texts[i] = text;
			}
			text.geometry.update(copy);
			var layout = text.geometry.layout;
			text.position.x = 400 -layout.width/2 + ((0.5-Math.random()) * 4000);
			text.position.y = 500 + (0.5-Math.random()) * 3000;
			text.position.z = (0.5-Math.random()) * 1500;

			text.updateMatrix();
			var pos = text.geometry.attributes.position.array;
			for (var j=0; j<pos.length; j+=4) {
				pos[j] += text.position.x;
				pos[j+1] += text.position.y;
				pos[j+2] += text.position.z;
			}
			text.geometry.attributes.position.needsUpdate = true;
			text.position.set(0,0,0);
		}
		var bigGeoLen = 0;
		for (var i=0; i<totalLen; i++) {
			if (!texts[i]) continue;
			var geo = texts[i].geometry;
			var parr = geo.attributes.position.array;
			bigGeoLen += parr.length;
		}
		bigGeoLen = 500 * totalLen;
		var bpos = bigGeo.attributes.position;
		var buv = bigGeo.attributes.uv;
		if (bigGeoLen > bpos.array.length) {
			bpos.array = new Float32Array(bigGeoLen);
			buv.array = new Float32Array(bigGeoLen/2);
		}
		var j = 0;
		for (var i=0; i<totalLen; i++) {
			if (!texts[i]) continue;
			var geo = texts[i].geometry;
			var parr = geo.attributes.position.array;
			var uarr = geo.attributes.uv.array;
			bpos.array.set(parr, j, parr.length);
			buv.array.set(uarr, j/2, uarr.length);
			j += parr.length;
		}
		bpos.needsUpdate = true;
		buv.needsUpdate = true;

	}

	// scale it down so it fits in our 3D units
	var textAnchor = new THREE.Object3D()
	textAnchor.scale.multiplyScalar(-0.025)
	app.scene.add(textAnchor)
	textAnchor.add(bigObj);

	window.onmousemove = function(ev) {
		app.camera.position.x = 25+0.016*(ev.clientX - window.innerWidth/2);
		app.camera.position.y = 25+0.016*(ev.clientY - window.innerHeight/2);
		app.camera.lookAt(target);
	};

	window.ontouchstart = function(ev) {};
	window.ontouchend = function(ev) {};
	window.ontouchcancel = function(ev) {};

	window.ontouchmove = function(ev) {
		app.camera.position.x = 25+0.016*(ev.touches[0].clientX - window.innerWidth/2);
		app.camera.position.y = 25+0.016*(ev.touches[0].clientY - window.innerHeight/2);
		app.camera.lookAt(target);
	};

	window.addEventListener('mousewheel', function(ev) {
		ev.preventDefault();
		app.camera.fov *= Math.pow(1.01, ev.wheelDelta);
		app.camera.fov = Math.min(120, Math.max(5, app.camera.fov));
		app.camera.updateProjectionMatrix();
	}, false);

	var lastUpdate = 0;
	var tick = function() {
		updateTexts();
		// app.camera.position.multiplyScalar(1 + (Math.sin(Date.now()/1000)*0.005));
		app.renderer.render(app.scene, app.camera);
		window.requestAnimationFrame(tick);
	};
	tick();

}
/*

// bundled geometry

	var texts = [];
	var bundles = [];
	var off = 0;
	var text = new THREE.Object3D();
	var updateTexts = function() {
		var len = 10;
		off = (off + len) % 1000;
		var bundle = bundles[off / len];
		if (!bundle) {
			bundle = bundles[off / len] = createText({text: "foo", font: font});
			texts[off / len] = new THREE.Mesh(bundle, material);
			textAnchor.add(texts[off / len]);
		} else {
			bundle.dispose();
			bundle = bundles[off / len] = texts[off / len].geometry = createText({text: "foo", font: font});
		}
		for (var i=0+off; i<len+off; i++) {
			var copy = new Date().toLocaleString();

			// create our text geometry
			var geom = createText({
				text: copy, // the string to render
				font: font // the bitmap font definition
				// width: 1000 // optional width for word-wrap
			});

			var layout = geom.layout;
			text.position.x = 400 -layout.width/2 + ((0.5-Math.random()) * 4000);
			text.position.y = 500 + (0.5-Math.random()) * 3000;
			text.position.z = (0.5-Math.random()) * 1500;
			text.updateMatrix();
			geom.applyMatrix(text.matrix);
			bundle.merge(geom);
		}

	}

}
*/
