(function() {
	var initEditor = function(controller) {

		controller.toDOM = function() {
			var sArray = function(arr) {
				return [].join.call(arr, ',');
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
				el.setAttribute('rotation', sArray(c.rotation));
				//el.setAttribute('scale', sArray(c.scale));
				el.setAttribute('draggable', c.draggable);
				if (c.dragXAxis) {
					el.setAttribute('drag-x-axis', sArray(c.dragXAxis));
				}
				if (c.dragYAxis) {
					el.setAttribute('drag-y-axis', sArray(c.dragYAxis));
				}
				//el.setAttribute('matrix', sArray(c.matrix));
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
					case DF.Types.Torus:
						el.setAttribute('radius', c.radius);
						el.setAttribute('inner-radius', c.innerRadius);
						break;
					case DF.Types.Prism:
						el.setAttribute('radius', c.radius);
						el.setAttribute('height', c.height);
						break;
					case DF.Types.Ring:
						el.setAttribute('radius', c.radius);
						el.setAttribute('inner-radius', c.innerRadius);
						el.setAttribute('height', c.height);
						el.setAttribute('corner-radius', c.cornerRadius);
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

		controller.load = function() {
			var input = document.createElement('input');
			input.type = 'file';
			input.onchange = function(ev) {
				var f = this.files[0];
				var r = new FileReader();
				r.onload = function(res) {
					controller.loadHTML(r.result);
				};
				r.readAsText(f);
			};
			input.click();
		};


		controller.renderHQ = function() {
			var minSC = this.minSampleCount;
			var maxSC = this.maxSampleCount;
			var maxRaySteps = this.maxRaySteps;
			this.minSampleCount = 16;
			this.maxSampleCount = 500;
			this.maxRaySteps = 3000;
			this.render();
			this.minSampleCount = minSC;
			this.maxSampleCount = maxSC;
			this.maxRaySteps = maxRaySteps;
		};

		var editButton = document.getElementById('edit');
		if (editButton) {
			editButton.classList.add('visible');
		}

		document.querySelector('#edit').onclick = function(ev) {
			ev.preventDefault();
			document.body.classList.toggle('editmode');
		};

	 	var gui = new dat.GUI();

	 	var cont = document.createElement('div');
	 	var editorContainer = cont;
	 	cont.id = 'onclick-editor-container';
	 	document.body.appendChild(cont);

		var makeEditor = function(id, buttonText, onButton) {
			var pre = document.createElement('pre');
			pre.id = id;
			cont.appendChild(pre);
			var btn = document.createElement('button');
			btn.innerHTML = buttonText;
			btn.onclick = function() {
				if (controller.current) {
					var val = editor.getValue();
					onButton(val);
				}
			};
			cont.appendChild(btn);
			var editor = ace.edit(id);
			editor.setTheme("ace/theme/monokai");
			editor.getSession().setMode("ace/mode/javascript");
			editor.on('focus', function() {
				pre.classList.add('focused');
				editor.resize();
			});
			editor.on('blur', function() {
				if (!document.activeElement || document.activeElement.tagName !== 'BUTTON') {
					pre.classList.remove('focused');
					editor.resize();
				}
			});
			return editor;
		};

		var editor = makeEditor('onclick-editor', 'Set OnClick', function(val) {
			controller.current.onclickString = val;
			controller.current.onclick = new Function('ev', val);
			console.log("click listener set");
		});

		var tickEditor = makeEditor('ontick-editor', 'Set OnTick', function(val) {
			controller.current.ontickString = val;
			controller.current.ontick = new Function('time', val);
			console.log("tick listener set");
		});

		var contentEditor = makeEditor('content-editor', 'Set Content', function(val) {
			controller.current.content = val;
		});


		controller.title = "Title";
		controller.content = "<p>Content HTML</p>";

		controller.radius = 0.95;
		controller.innerRadius = 0.5;
		controller.cornerRadius = 0.05;
		controller.height = 0.1;
		controller.boxiness = 0.01;
		controller.material.diffuse = 0.1;

		controller.onclick = ([
		'// Example click event listener. Press Set OnClick to try it out.',
		'if (this.ival) return;',
		'var p = this.position[1];',
		'var self = this;',
		'var t = 0;',
		'this.ival = setInterval(function() {',
		'	if (t > 1000) {',
		'		t = 1000;',
		'		clearInterval(self.ival);',
		'		self.ival = null;',
		'	}',
		'	self.position[1] = p + 1-Math.cos(t/1000*Math.PI*2);',
		'	t += 16;',
		'}, 16);'
		]).join("\n");

		controller.ontick = ([
		'// Example frame tick listener. Press Set OnTick to try it out.',
		'this.rotation[0] += 0.001;',
		'this.rotation[1] += 0.001;',
		'this.rotation[2] += 0.001;'
		]).join("\n");

		editor.setValue( controller.onclick.toString() );
		controller.gui = gui;
		controller.color = 0xFFFFFF;

		controller.createNew = function() {
			if (this.objectCount === this.maxObjectCount) {
				alert("Maximum object count reached, can't create more objects. Sorry about that.")
				return;
			}
			var cube = new DF[this.typeName]();
			cube.material.transmit.set(this.transmit.getValue().map(function(v) {return v/255;}));
			cube.material.emit.set(this.emit.getValue().map(function(v) {return v/255;}));
			cube.material.diffuse = this.diffuse.getValue();
			if (!this.current) {
				cube.title = this.titleC.getValue();
			}
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

		var hide = function(el) { el.domElement.parentNode.parentNode.parentNode.style.display = 'none'; };
		var show = function(el) { el.domElement.parentNode.parentNode.parentNode.style.display = 'block'; };

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
				tickEditor.setValue(this.current.ontickString || this.ontick);
				contentEditor.setValue(this.current.content);
				this.titleC.setValue(this.current.title);
				this.draggableC.setValue(this.current.draggable);
				this.x.setValue(current.position[0]);
				this.y.setValue(current.position[1]);
				this.z.setValue(current.position[2]);
				this.diffuse.setValue(current.material.diffuse);
				this.transmit.setValue([].map.call(current.material.transmit, function(v) { return v*255; }))
				this.emit.setValue([].map.call(current.material.emit, function(v) { return v*255; }))
				this.type.setValue(DF.typeNames[current.type]);
				if (current.dimensions) {
					show(this.sX);
					show(this.sY);
					show(this.sZ);
					this.sX.setValue(current.dimensions[0]);
					this.sY.setValue(current.dimensions[1]);
					this.sZ.setValue(current.dimensions[2]);
				} else {
					hide(this.sX);
					hide(this.sY);
					hide(this.sZ);
				}
				if (current.height != null) {
					show(this.heightC);
					this.heightC.setValue(current.height);
				} else { hide(this.heightC); }
				if (current.radius != null) {
					show(this.radiusC);
					this.radiusC.setValue(current.radius);					
				} else { hide(this.radiusC); }
				if (current.innerRadius != null) {
					show(this.innerRadiusC);
					this.innerRadiusC.setValue(current.innerRadius);
				} else { hide(this.innerRadiusC); }
				if (current.boxiness != null) {
					show(this.boxinessC);
					this.boxinessC.setValue(current.boxiness);					
				} else { hide(this.boxinessC); }
				if (current.cornerRadius != null) {
					show(this.cornerRadiusC);
					this.cornerRadiusC.setValue(current.cornerRadius);					
				} else { hide(this.cornerRadiusC); }
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
		controller.type = gui.add(controller, 'typeName', ['Box', 'Sphere', 'Torus', 'Prism', 'Ring']).name("Type").onChange(function(type) {
			var idx = controller.objects.indexOf(controller.current);
			if (idx !== -1 && !(controller.current instanceof DF[type])) {
				controller.objects[idx] = new DF[type]({
					position: controller.current.position, 
					rotation: controller.current.rotation, 
					material: controller.current.material,
					title: controller.current.title,
					content: controller.current.content,
					draggable: controller.current.draggable,
					dragXAxis: controller.current.dragXAxis,
					dragYAxis: controller.current.dragYAxis,
					ontick: controller.current.ontick,
					ontickString: controller.current.ontickString,
					onclick: controller.current.onclick,
					ontick: controller.current.ontick,
					onclickString: controller.current.onclickString
				});
				controller.setCurrent(controller.objects[idx]);
			}
		});

		gui.add(controller, 'createNew').name("Create new object");
		gui.add(controller, 'deleteSelected').name("Delete selected object");
		if (!window.windows) { // DX9 doesn't have instruction budget for single-pass HQ renders
			gui.add(controller, 'renderHQ').name("HQ render");
		}

		controller.draggableC = gui.add(controller, 'draggable').onChange(function(v) {
			if (controller.current) {
				controller.current.draggable = v;
			}
		});

		// Skybox editors
		controller.sunColor = gui.addColor(controller.skybox, 'sunColor').onChange(function() {controller.changed=true;});
		controller.skyColor = gui.addColor(controller.skybox, 'skyColor').onChange(function() {controller.changed=true;});
		controller.groundColor = gui.addColor(controller.skybox, 'groundColor').onChange(function() {controller.changed=true;});
		controller.horizonColor = gui.addColor(controller.skybox, 'horizonColor').onChange(function() {controller.changed=true;});

		// Title
		controller.titleC = controller.proxy(['title'], undefined, undefined, undefined, "Title");

		// Material
		controller.transmit = controller.proxyColor(['material', 'transmit'], 'Transmit');
		controller.emit = controller.proxyColor(['material', 'emit'], 'Emit');
		controller.diffuse = controller.proxy(['material', 'diffuse'], 0.0, 1.0, 0.01, 'Diffuse');

		controller.x = controller.proxy(['position', 0], -10.1, 10.1, 0.1, "X");
		controller.y = controller.proxy(['position', 1], -10.1, 10.1, 0.1, "Y");
		controller.z = controller.proxy(['position', 2], -10.1, 10.1, 0.1, "Z");

		// Box editors
		controller.sX = controller.proxy(['dimensions', 0], 0.1, 6, 0.1, 'Width');
		controller.sY = controller.proxy(['dimensions', 1], 0.1, 6, 0.1, 'Height');
		controller.sZ = controller.proxy(['dimensions', 2], 0.1, 6, 0.1, 'Depth');

		controller.cornerRadiusC = controller.proxy(['cornerRadius'], 0.0, 1.0, 0.05, 'Corner radius');
		controller.boxinessC = controller.proxy(['boxiness'], 0.0, 1.0, 0.1, 'Boxiness');

		// Sphere editors
		controller.radiusC = controller.proxy(['radius'], 0.1, 6, 0.1, 'Radius');

		// Torus editors
		controller.innerRadiusC = controller.proxy(['innerRadius'], 0.0, 0.9, 0.1, 'Inner Radius');

		// Ring editors
		controller.heightC = controller.proxy(['height'], 0.1, 6, 0.1, 'Height');

		// Light position
		controller.lightPosX = gui.add(controller.skybox.lightPos, 0, -10, 10, 0.1).name("Light X").onChange(function() {controller.changed=true;});
		controller.lightPosY = gui.add(controller.skybox.lightPos, 1, -10, 10, 0.1).name("Light Y").onChange(function() {controller.changed=true;});
		controller.lightPosZ = gui.add(controller.skybox.lightPos, 2, -10, 10, 0.1).name("Light Z").onChange(function() {controller.changed=true;});

		gui.add(controller, 'package').name("Download scene");
		gui.add(controller, 'load').name("Load scene");
	};

	var ticker = function() {
		if (window.ace && window.dat && window.rmdfController) initEditor(window.rmdfController);
		else setTimeout(ticker, 100);
	};
	ticker();
})();
