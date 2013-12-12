(function(){

	var contact = document.getElementById('contact');

	document.getElementById('contact-link').onclick = function(ev){
		ev.preventDefault();
		about.classList.remove('visible');
		if (contact.classList.contains('visible')) {
			contact.classList.remove('visible');
		} else {
			contact.classList.add('visible');
		}
	};

	var loadFiles = function(files, callback) {
		var results = [];
		var count = 0;
		for (var i=0; i<files.length; i++) {
			(function(i){
				var xhr = new XMLHttpRequest();
				xhr.open('GET', files[i]);
				xhr.onload = function(ev) {
					results[i] = this.responseText;
					count++;
					if (count === files.length) {
						callback.apply(null, results);
					}
				};
				xhr.send(null);
			})(i);
		}
		return results;
	};

	var canvas = document.createElement('canvas');
	canvas.width = canvas.height = 256;
	var id = canvas.getContext('2d').createImageData(256,256);
	for (var y=0; y<id.height; y++) {
		for (var x=0; x<id.width; x++) {
			var off = y*id.width + x;
			var off2 = ((y+17) % id.height)*id.width + ((x+37) % id.width);
			var v = Math.floor(256 * Math.random());
			id.data[off*4] = id.data[off2*4+1] = v;
			id.data[off*4+3] = 255;
		}
	}
	canvas.getContext('2d').putImageData(id, 0, 0);

	var tex = new THREE.Texture(canvas);
	tex.wrapT = tex.wrapS = THREE.RepeatWrapping;
	tex.minFilter = THREE.LinearMipMapLinearFilter;
	tex.magFilter = THREE.LinearFilter;
	tex.generateMipmaps = true;
	tex.flipY = false;
	tex.needsUpdate = true;	


	loadFiles(['rt.vert', 'zardoz_2001.frag'], function(rtVert, rtFrag) {
		var renderer = new THREE.WebGLRenderer();
		var resize = function() {
			renderer.setSize(window.innerWidth, window.innerHeight);
			plane.material.uniforms.iResolution.value.x = renderer.domElement.width;
			plane.material.uniforms.iResolution.value.y = renderer.domElement.height;
		};
		document.body.appendChild(renderer.domElement);
		renderer.setClearColor(0x0000ff);

		var scene = new THREE.Scene();
		var camera = new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1);
		scene.add(camera);
		var plane = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2, 1, 1),
			new THREE.ShaderMaterial({
				clean: true,
				attributes: {},
				uniforms: {
					iChannel0: {type: "t", value: tex},
					iGlobalTime: { type: "f", value: 0 },
					iRot: { type: "f", value: 0 },
					iRot2: { type: "f", value: 0 },
					iOpen: { type: "f", value: 0 },
					iResolution: { type: "v3", value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1.0) },
					iMouse: { type: "v4", value: new THREE.Vector4(-1, -1, -1, -1) }
				},
				vertexShader: rtVert,
				fragmentShader: rtFrag
			})
		);
		scene.add(plane);

		var sin = Math.sin;
		var cos = Math.cos;
		var getCenter = function(time, k, i, n) {
			var m = 1.0;
			time *= 0.3;
			var r = 20.0;
			if (n == 0.0) {
				r = 0.0;
			}
			var v = new THREE.Vector3(
				-80.0+sin(m*2.0+time) * (-100.0+sin(time*0.4+m)*40.0 + 
							 sin(time+n*(6.28/3.0))*r + 4.0*sin(m+n+i+4.0*time)+(i)*5.0),
				-40.0+(m)*30.0 - cos(time+n*(6.28/3.0))*r - cos(i)*9.0 + k*2.5,
				2.0+cos(m*2.0+time) * (-cos(time*0.2+m)*28.0 + (n)*9.0 + sin(i)*9.0)
			);
			v.r = 1.0;
			return v;
		};

		var t = 1269.5;
		var targetRot = 0;
		var targetOpen = 0;

		renderer.domElement.onmousedown = function(ev) {
			var m = plane.material.uniforms.iMouse;
			m.value.z = ev.layerX;
			m.value.w = this.offsetHeight-ev.layerY;
			targetRot -= 0.25*Math.PI;
			//renderer.render(scene, camera);
		};
		renderer.domElement.onmouseup = function(ev) {
			var m = plane.material.uniforms.iMouse;
			m.value.z = -1;
			m.value.w = -1;
			targetOpen = targetOpen ? 0 : 1;
			//renderer.render(scene, camera);
		};
		renderer.domElement.onmousemove = function(ev) {
			var m = plane.material.uniforms.iMouse;
			m.value.x = ev.layerX;
			m.value.y = this.offsetHeight-ev.layerY;
		};
		window.onresize = function() {
			resize();
		};

		var tick = function() {
			var r =	plane.material.uniforms.iRot;
			r.value += (targetRot - r.value) * 0.1;
			if (Math.abs(targetRot-r.value) < 0.01) {
				r.value = targetRot;
				var r =	plane.material.uniforms.iOpen;
				r.value += (targetOpen - r.value) * 0.15;
				if (Math.abs(targetOpen - r.value) < 0.01) {
					r.value = targetOpen;
					if (r.value === 1) {
						plane.material.uniforms.iRot2.value += 0.01;
					}
				}
			}
			plane.material.uniforms.iGlobalTime.value = t;
			renderer.render(scene, camera);
			t += 0.016;
			requestAnimationFrame(tick, renderer.domElement);
		};
		resize();
		tick();
	});
})();
