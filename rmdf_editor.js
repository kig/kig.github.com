(function() {
	var initEditor = function(controller) {
		var editButton = document.getElementById('edit');
		if (editButton) {
			editButton.classList.add('visible');
		}

	 	var gui = new dat.GUI();

	 	var cont = document.createElement('div');
	 	var editorContainer = cont;
	 	cont.id = 'onclick-editor-container';
	 	document.body.appendChild(cont);

	 	var pre = document.createElement('pre');
	 	pre.id = 'onclick-editor';
	 	cont.appendChild(pre);
	 	var btn = document.createElement('button');
	 	btn.innerHTML = "Set Onclick";
	 	btn.onclick = function() {
	 		if (controller.current) {
	 			var val = editor.getValue();
	 			controller.current.onclickString = val;
		 		controller.current.onclick = new Function('ev', val);
	 			console.log("click listener set");
	 		}
	 	};
	 	cont.appendChild(btn);
	 	var editor = ace.edit("onclick-editor");
	    editor.setTheme("ace/theme/monokai");
	    editor.getSession().setMode("ace/mode/javascript");

	 	var pre = document.createElement('pre');
	 	pre.id = 'content-editor';
	 	cont.appendChild(pre);
	 	var btn = document.createElement('button');
	 	btn.innerHTML = "Set Content";
	 	btn.onclick = function() {
	 		if (controller.current) {
	 			var val = contentEditor.getValue();
	 			controller.current.content = val;
	 		}
	 	};
	 	cont.appendChild(btn);
	 	var contentEditor = ace.edit("content-editor");
	    contentEditor.setTheme("ace/theme/monokai");
	    contentEditor.getSession().setMode("ace/mode/html");


		controller.title = "Title";
		controller.content = "<p>Content HTML</p>";

		controller.radius = 0.95;
		controller.cornerRadius = 0.05;
		controller.material.diffuse = 0.1;

		controller.onclick = ([
		'// Example click event listener. Press Set Onclick to try it out.',
		'var p = this.position[1];',
		'var self = this;',
		'var t = 0;',
		'this.ival = setInterval(function() {',
		'	if (t > 1000) {',
		'		t = 1000;',
		'		clearInterval(self.ival);',
		'	}',
		'	self.position[1] = p + 1-Math.cos(t/1000*Math.PI*2);',
		'	t += 16;',
		'}, 16);'
		]).join("\n");

		editor.setValue( controller.onclick.toString() );
		controller.gui = gui;
		controller.color = 0xFFFFFF;

		controller.createNew = function() {
			var cube = new DF[this.typeName]();
			cube.material.transmit.set([Math.random(), Math.random(), Math.random()])
			cube.material.diffuse = 0.1;
			this.objects[this.objectCount++] = cube;
			this.setCurrent(cube);
		};
		controller.deleteSelected = function() {
			if (this.current) {
				this.objects.splice(this.objects.indexOf(this.current), 1);
				this.objectCount--;
				this.current = null;
			}
		};
		controller.setCurrent = function(current) {
			if (this.current && this.current.originalEmit != null) {
				//this.current.material.emit.set(this.current.originalEmit);
				//this.current.originalEmit = null;
			}
			this.current = current;
			if (this.current) {
				if (this.current.material.emit[0] !== 0.2) {
					//this.current.originalEmit = vec3.clone(this.current.material.emit);
					//this.current.material.emit.set(Vec3(0.2));
				}
				editor.setValue(this.current.onclickString || this.onclick);
				contentEditor.setValue(this.current.content);
				this.titleC.setValue(this.current.title);
				this.x.setValue(current.position[0]);
				this.y.setValue(current.position[1]);
				this.z.setValue(current.position[2]);
				this.diffuse.setValue(current.material.diffuse);
				this.transmit.setValue([].map.call(current.material.transmit, function(v) { return v*255; }))
				this.emit.setValue([].map.call(current.material.emit, function(v) { return v*255; }))
				this.type.setValue(DF.typeNames[current.type]);
				if (current.dimensions) {
					this.sX.setValue(current.dimensions[0]);
					this.sY.setValue(current.dimensions[1]);
					this.sZ.setValue(current.dimensions[2]);
					this.cornerRadiusC.setValue(current.cornerRadius);
				}
				if (current.radius != null) {
					this.radiusC.setValue(current.radius);					
				}
				editorContainer.style.display = 'block';
			} else {
				editorContainer.style.display = 'none';
				this.titleC.setValue("");
				this.x.setValue(0);
				this.y.setValue(0);
				this.z.setValue(0);
				this.type.setValue('Box');				
			}
		};
		controller.proxy = function(propertyChain, min, max, step, name) {
			var controller = this;
			var tgt = controller;
			for (var i=0; i<propertyChain.length-1; i++) {
				tgt = tgt[propertyChain[i]];
			}
			var last = propertyChain[propertyChain.length-1];
			return this.gui.add(tgt, last, min, max, step).name(name).onChange(function(v) {
				var t = controller.current;
				if (t) {
					for (var i=0; i<propertyChain.length-1; i++) {
						t = t[propertyChain[i]];
					}
					t[last] = v;
				}
			});
		};
		controller.proxyColor = function(propertyChain, name) {
			var controller = this;
			var tgt = controller;
			for (var i=0; i<propertyChain.length-1; i++) {
				tgt = tgt[propertyChain[i]];
			}
			var last = propertyChain[propertyChain.length-1];
			tgt[last] = [].slice.call(tgt[last]).map(function(v) { return v*255; });
			return this.gui.addColor(tgt, last).name(name).onChange(function(v) {
				var t = controller.current;
				if (t) {
					for (var i=0; i<propertyChain.length-1; i++) {
						t = t[propertyChain[i]];
					}
					t[last][0] = v[0]/255;
					t[last][1] = v[1]/255;
					t[last][2] = v[2]/255;
				}
			});
		};

		editorContainer.style.display = 'none';

		controller.typeName = 'Box';
		controller.type = gui.add(controller, 'typeName', ['Box', 'Sphere']).name("Type").onChange(function(type) {
			var idx = controller.objects.indexOf(controller.current);
			if (idx !== -1 && !(controller.current instanceof DF[type])) {
				controller.objects[idx] = new DF[type]({position: controller.current.position, material: controller.current.material});
				controller.setCurrent(controller.objects[idx]);
			}
		});

		controller.toDOM = function() {
			var sArray = function(arr) {
				return [].join.call([].slice.call(arr, 0, 3), ',');
			};
			var sColor = function(arr) {
				return sArray(arr.map(function(v) { return v / 255; }));
			};
			var sColorF = function(arr) {
				return sArray(arr);
			};
			var scene = document.createElement('rmdf-scene');
			scene.setAttribute('sun-position', sArray(this.skybox.lightPos));
			scene.setAttribute('sun-color', sColor(this.skybox.sunColor));
			scene.setAttribute('sky-color', sColor(this.skybox.skyColor));
			scene.setAttribute('ground-color', sColor(this.skybox.groundColor));
			scene.setAttribute('horizon-color', sColor(this.skybox.horizonColor));
			scene.setAttribute('camera-position', sArray(this.camera.position));
			scene.setAttribute('camera-target', sArray(this.camera.target));
			scene.setAttribute('camera-iso', this.camera.ISO);
			scene.setAttribute('camera-exposure-compensation', this.camera.exposureCompensation);
			scene.setAttribute('camera-shutter-speed', this.camera.shutterSpeed);
			for (var i=0; i<this.objectCount; i++) {
				var c = this.objects[i];
				var el = document.createElement('rmdf-'+DF.typeNames[c.type].toLowerCase());
				scene.appendChild(el);
				if (c.title) {
					var title = document.createElement('title');
					title.textContent = c.title;
					el.appendChild(title);
				}
				if (c.content) {
					var content = document.createElement('content');
					content.innerHTML = c.content;
					el.appendChild(content);
				}
				if (c.onclickString) {
					var onclick = document.createElement('onclick');
					onclick.appendChild(document.createTextNode(c.onclickString));
					el.appendChild(onclick);
				}
				if (c.ontickString) {
					var ontick = document.createElement('ontick');
					ontick.appendChild(document.createTextNode(c.ontickString));
					el.appendChild(ontick);
				}
				el.setAttribute('position', sArray(c.position));
				el.setAttribute('material-transmit', sColorF(c.material.transmit));
				el.setAttribute('material-diffuse', c.material.diffuse);
				el.setAttribute('material-emit', sColorF(c.material.emit));
				switch (c.type) {
					case DF.Types.Box:
						el.setAttribute('dimensions', sArray(c.dimensions));
						el.setAttribute('corner-radius', c.cornerRadius);
						break;
					case DF.Types.Sphere:
						el.setAttribute('radius', c.radius);
						break;
				}
			}
			return scene;
		};
		controller.toHTML = function() {
			var frag = document.createElement('div');
			frag.appendChild(this.toDOM());
			return frag.innerHTML;
		};
		controller.package = function() {
			var sceneHTML = this.toHTML();
			var blob = new Blob([sceneHTML], {type: 'text/html'});
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = 'scene.rmdf';
			a.click();
		};

		gui.add(controller, 'createNew').name("Create new object");
		gui.add(controller, 'deleteSelected').name("Delete selected object");
		gui.add(controller, 'package').name("Download scene");

		controller.x = controller.proxy(['position', 0], -10.1, 10.1, 0.1, "X");
		controller.y = controller.proxy(['position', 1], -10.1, 10.1, 0.1, "Y");
		controller.z = controller.proxy(['position', 2], -10.1, 10.1, 0.1, "Z");

		controller.titleC = controller.proxy(['title'], undefined, undefined, undefined, "Title");

		controller.transmit = controller.proxyColor(['material', 'transmit'], 'Transmit');
		controller.emit = controller.proxyColor(['material', 'emit'], 'Emit');
		controller.diffuse = controller.proxy(['material', 'diffuse'], 0.0, 1.0, 0.01, 'Diffuse');

		// Box editors
		controller.sX = controller.proxy(['dimensions', 0], 0.1, 6, 0.1, 'Width');
		controller.sY = controller.proxy(['dimensions', 1], 0.1, 6, 0.1, 'Height');
		controller.sZ = controller.proxy(['dimensions', 2], 0.1, 6, 0.1, 'Depth');
		controller.cornerRadiusC = controller.proxy(['cornerRadius'], 0.05, 1, 0.05, 'Corner radius');

		// Sphere editors
		controller.radiusC = controller.proxy(['radius'], 0.1, 6, 0.1, 'Radius');

		// Skybox editors
		controller.sunColor = gui.addColor(controller.skybox, 'sunColor');
		controller.skyColor = gui.addColor(controller.skybox, 'skyColor');
		controller.groundColor = gui.addColor(controller.skybox, 'groundColor');
		controller.horizonColor = gui.addColor(controller.skybox, 'horizonColor');
		controller.lightPosX = gui.add(controller.skybox.lightPos, 0, -10, 10, 0.1).name("Light X");
		controller.lightPosY = gui.add(controller.skybox.lightPos, 1, -10, 10, 0.1).name("Light Y");
		controller.lightPosZ = gui.add(controller.skybox.lightPos, 2, -10, 10, 0.1).name("Light Z");
	};

	var ticker = function() {
		if (window.ace && window.dat && window.rmdfController) initEditor(window.rmdfController);
		else setTimeout(ticker, 0);
	};
	ticker();
})();
