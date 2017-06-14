var specialKeys = {id: true, fCurves: true, tweenCurves: true, time: true};

var savedTimeline = '{"Sky":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-8.5,3.5,5.400000095367432]}],"Camera":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]],"target":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]],"target":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[0,0,-13,0],"target":[0,0,0,1]},{"time":0.8333333333333334,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]],"target":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.275,0.8977015972137452,0.275,-0.8977015972137452],[-0.275,-0.3039934873580933,0.275,0.3039934873580933],[-0.275,-4.810693645477295,0.275,4.810693645477295],[-0.275,0,0.275,0]],"target":[[-0.275,-0.2748531460762024,0.275,0.2748531460762024],[-0.275,-0.706848692893982,0.275,0.706848692893982],[-0.275,-1.289352321624756,0.275,1.289352321624756],[-0.275,0,0.275,0]]},"position":[-17.531551361083984,-0.06405124813318253,-3.735208749771118,0],"target":[-10.848838806152344,2.521425724029541,7.1963582038879395,1]},{"time":1.8333333333333333,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]],"target":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.32999999999999996,-4.4765456914901725,0.32999999999999996,4.4765456914901725],[-0.32999999999999996,0.017112836502492425,0.32999999999999996,-0.017112836502492425],[-0.32999999999999996,-1.232819949388504,0.32999999999999996,1.232819949388504],[-0.32999999999999996,0,0.32999999999999996,0]],"target":[[-0.32999999999999996,-3.0060426878929136,0.32999999999999996,3.0060426878929136],[-0.32999999999999996,1.5629529547691343,0.32999999999999996,-1.5629529547691343],[-0.32999999999999996,2.462779319286346,0.32999999999999996,-2.462779319286346],[-0.32999999999999996,0,0.32999999999999996,0]]},"position":[-5.984677314758301,2.026623249053955,19.071290969848633,0],"target":[1.8323543071746826,4.712324619293213,8.595682144165039,1]},{"time":2.8333333333333335,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]],"target":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.33000000000000007,-0.8777174268777554,0.33000000000000007,0.8777174268777554],[-0.33000000000000007,0.44448821315398584,0.33000000000000007,-0.44448821315398584],[-0.33000000000000007,3.943714353121244,0.33000000000000007,-3.943714353121244],[-0.33000000000000007,0,0.33000000000000007,0]],"target":[[-0.33000000000000007,-1.6100504768811739,0.33000000000000007,1.6100504768811739],[-0.33000000000000007,0.01958148589501014,0.33000000000000007,-0.01958148589501014],[-0.33000000000000007,1.9901586297842173,0.33000000000000007,-1.9901586297842173],[-0.33000000000000007,0,0.33000000000000007,0]]},"position":[9.599028587341309,-0.16776540875434875,3.7364273071289062,0],"target":[7.369601726531982,-6.951016426086426,-7.72957706451416,1]},{"time":4,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]],"target":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.385,1.4658190863363203,0.385,-1.4658190863363203],[-0.385,-0.11172269427007243,0.385,0.11172269427007243],[-0.385,2.56168309796241,0.385,-2.56168309796241],[-0.385,0,0.385,0]],"target":[[-0.385,0.8389872458673292,0.385,-0.8389872458673292],[-0.385,-1.007792561900231,0.385,1.007792561900231],[-0.385,-1.2357619899319063,0.385,1.2357619899319063],[-0.385,0,0.385,0]]},"position":[-0.22188612818717957,-0.891733705997467,-6.821783065795898,0],"target":[12.403392791748047,4.583759307861328,-4.471015930175781,1]},{"time":5.416666666666667,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]],"target":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]],"target":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-0.23655402660369873,0.5818890333175659,-13.45235538482666,0],"target":[1.7400336265563965,-0.18877196311950684,0.5623323917388916,1]}],"Sphere 0":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[2.496350049972534,3.839962959289551,1.3823992013931274,1]}],"Sphere 1":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.6041666666666665,-0.5,0.6041666666666665,0.5],[-0.6145833333333334,0,0.6145833333333334,0],[-0.5937499999999999,-0.5,0.5937499999999999,0.5],[-0.5625,-0.5,0.5625,0.5]]},"position":[1.21330726146698,0.7952590584754944,-3.5843122005462646,1]},{"time":0.8333333333333334,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.275,0.3133391508034298,0.275,-0.3133391508034298],[-0.275,-0.8583906148161208,0.275,0.8583906148161208],[-0.275,-2.0256318398884368,0.275,2.0256318398884368],[-0.275,0,0.275,0]]},"position":[-12.453531265258789,2.457167148590088,1.5241636037826538,1]},{"time":1.75,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.3025,-2.8104386415481573,0.3025,2.8104386415481573],[-0.3025,1.110669165802002,0.3025,-1.110669165802002],[-0.3025,0.741750686788559,0.3025,-0.741750686788559],[-0.39625000000000027,-0.5,0.39625000000000027,0.5]]},"position":[-0.7806691527366638,6.257744789123535,9.306072235107422,1]},{"time":2.9166666666666665,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.28166666666666673,-6.907211856198312,0.28166666666666673,6.907211856198312],[-0.3025000000000001,0.287881028366089,0.3025000000000001,-0.287881028366089],[-0.3025000000000001,1.871683820056916,0.3025000000000001,-1.871683820056916],[-0.3025000000000001,0,0.3025000000000001,0]]},"position":[6.902106761932373,-5.1920695304870605,-3.5843122005462646,1]},{"time":3.8333333333333335,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.5316666666666667,4.826013687467576,0.5316666666666667,-4.826013687467576],[-0.3025000000000001,-0.8693601111173633,0.3025000000000001,0.8693601111173633],[-0.3025000000000001,0,0.3025000000000001,0],[-0.3025000000000001,0,0.3025000000000001,0]]},"position":[12.354398727416992,4.275093078613281,-3.5843122005462646,1]},{"time":5,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.5833333333333333,0,0.5833333333333333,0],[-0.59375,-0.5,0.59375,0.5],[-0.6145833333333334,-0.5,0.6145833333333334,0.5]]},"position":[1.21330726146698,0.7952590584754944,-3.5843122005462646,1]}],"Sphere 2":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-4.092320919036865,1.5914746522903442,0.797997772693634,1]}],"Sphere 3":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-1.0976654291152954,0.5570468306541443,2.8758482933044434,1]}],"Sphere 4":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[1.2383532524108887,-1.9331320524215698,1.8043053150177002,1]}],"Sphere 5":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[3.186293363571167,3.811965227127075,-3.132746458053589,1]}],"Sphere 6":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-4.7252326011657715,-3.0573980808258057,-1.4151302576065063,1]}],"Sphere 7":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-3.3502161502838135,1.413374900817871,1.893074870109558,1]}],"Sphere 8":[{"time":0,"tweenCurves":{"position":[[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1],[0,0,0.25,0.25,0.75,0.75,1,1]]},"fCurves":{"position":[[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0],[-0.25,0,0.25,0]]},"position":[-3.5648510456085205,1.966158390045166,3.7201287746429443,1]}]}';


var scrollIntoViewIfNeeded = function(el) {
	if (el.scrollIntoViewIfNeeded) {
		el.scrollIntoViewIfNeeded();
	} else {
		var bbox = el.getBoundingClientRect();
		var pbb = el.parentNode.getBoundingClientRect();
		if (bbox.left >= pbb.right || bbox.right <= pbb.left || bbox.top >= pbb.bottom || bbox.bottom <= pbb.top) {
			el.scrollIntoView();
		}
	}
};

(function(){
var init = function() {
	if (DEBUG) console.log('script start to execute: '+(Date.now()-window.startScript)+' ms');

	var iResolution = vec3(glc.width, glc.height, 1.0);

	var setShader = function(p) {
		gl.useProgram(p);
		startT = Date.now();
		u3fv(gl, p, 'iResolution', iResolution);
		u1i(gl, p, 'iChannel0', 0);
		u1i(gl, p, 'iChannel1', 1);
		var pos = gl.getAttribLocation(p, 'position');
		gl.enableVertexAttribArray(pos);
		gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 0, 0);
	};

	var currentShader;

	var setStaticShader = function() {
		if (currentShader === 'static') {
			return;
		}
		currentShader = 'static';
		p = staticShader;
		if (typeof p === 'string') {
			p = staticShader = createProgram(gl, rtShader, p);
		}
		setShader(p);
	};

	var setAnimShader = function() {
		if (currentShader === 'anim') {
			return;
		}
		currentShader = 'anim';
		p = animShader;
		if (typeof p === 'string') {
			p = animShader = createProgram(gl, rtShader, p);
		}
		setShader(p);
	};

	var staticShader, animShader, p;

	var rtVert = 'precision highp float;attribute vec3 position;void main() {gl_Position = vec4(position, 1.0);}';
	var rtShader = createShader(gl, rtVert, gl.VERTEX_SHADER);

	Loader.get(shaderURLs, function(mblurFrag) {

		staticShader = mblurFrag.replace("#define MBLUR_SAMPLES 4.0", "#define MBLUR_SAMPLES 16.0");
		animShader = mblurFrag.replace("#define MBLUR_SAMPLES 4.0", "#define MBLUR_SAMPLES 2.0");

		var forceRedraw = false;
		var t1 = Date.now();
		var t0 = Date.now();
		var buf = createBuffer(gl);
		var rTex = createTexture(gl, randomTex, 0);
		var posTex = new Float32Array(4*16*2);
		posTex.width = 16;
		posTex.height = 2;
		for (var i=0; i<posTex.length; i+=4) {
			posTex[i] = (i/4-8)*2;
			posTex[i+1] = (i/4-8)*2;
			posTex[i+2] = (i/4-8)*2;
			posTex[i+3] = Math.max(1, i/4);
		}
		var pTex = createTexture(gl, posTex, 1);
		if (DEBUG) console.log('Set up WebGL: '+(Date.now()-t0)+' ms');

		var resize = function() {
			// Disabled HiDPI because those machines don't have enough FLOPS per pixel. 
			// FIXME Re-enable in 2022.
			glc.width = (window.innerWidth); // * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			glc.height = (window.innerHeight - 200); // * (window.mobile ? 1 : (window.devicePixelRatio || 1));
			iResolution[0] = glc.width;
			iResolution[1] = glc.height;
			gl.viewport(0,0, glc.width, glc.height);
			u3fv(gl, p, 'iResolution', iResolution);
			forceRedraw = true;
		};


		setStaticShader();


		var t = 0;
		var mouse = new Float32Array(4);

		var useFourView = false;

		var tDown = 0;

		var down = false;
		var pick = -2;

		var displayPlaneIntersect = vec3();
		var previousDisplayPlaneIntersect = vec3();
		var cameraNormal = vec3();
		var motion = vec3();

		window.addEventListener('wheel', function(ev) {
			if (ev.target !== glc) return;
			ev.preventDefault();
			var d = ev.deltaY;
			cameraTarget[3] *= Math.pow(1.001, d);
			cameraTarget[3] = Math.min(Math.max(cameraTarget[3], 0.1), 10);
			forceRedraw = true;
		}, false);

		window.onmousedown = function(ev) {
			if (ev.target !== glc) return;
			if (ev.button !== 0) {
				//useFourView = !useFourView;
				//ev.preventDefault();
				return;
			}
			mouse[2] = ev.layerX;
			mouse[3] = glc.offsetHeight-ev.layerY;
			mouse[0] = mouse[2];
			mouse[1] = mouse[3];
			down = true;
			tDown = t;
			getEye(useFourView, iResolution, cameraPos, cameraTarget, mouse, cpos);
			getDir(useFourView, iResolution, cameraPos, cameraTarget, mouse, cdir);
			pick = trace(cpos, cdir, posTex).pick;
			if (pick >= 0) {
				target = pick;
				normalize(sub(cameraTarget, cameraPos, cameraNormal));
				traceDisplayPlaneAt(cameraPos, cdir, spheres[target].position, cameraNormal, displayPlaneIntersect);
				previousDisplayPlaneIntersect.set(displayPlaneIntersect);
				setCurrentObject("Sphere " + target);
			} else {
				setCurrentObject("Camera");
			}
			ev.preventDefault();
			forceRedraw = true;
		};

		window.onmouseup = function(ev) {
			mouse[2] = -1;
			mouse[3] = -1;
			if (down) {
				if (pick >= 0) {
					pick = -2;
				}
				target = -2;
				down = false;
				ev.preventDefault();
				forceRedraw = true;
			}
		};

		window.onmousemove = function(ev) {
			if (down) {
				var mx = ev.layerX;
				var my = (glc.offsetHeight-ev.layerY);
				if (target >= 0) {
					mouse[0] = ev.layerX;
					mouse[1] = glc.offsetHeight-ev.layerY;
					getDisplayPlaneIntersect(useFourView, iResolution, cameraPos, cameraTarget, mouse, spheres[target].position, displayPlaneIntersect);
					spheres[target].position.set(displayPlaneIntersect);
					previousDisplayPlaneIntersect.set(displayPlaneIntersect);
					addKeyframe();
				} else {
					var dx = mx - mouse[0];
					var dy = my - mouse[1];
					dx *= 0.1;
					dy *= 0.1;

					motion[0] = -dx;
					motion[1] = -dy;
					motion[2] = 0;

					xyz(up, Math.sin(cameraPos[3]), Math.cos(cameraPos[3]), 0);
					normalize(sub(cameraTarget, cameraPos, zaxis));
					normalize(cross(up, zaxis, xaxis));
					normalize(cross(zaxis, xaxis, yaxis));
					cdir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], motion);
					cdir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], motion);
					cdir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], motion);

					if (ev.shiftKey) {
						add(cameraPos, cdir, cameraPos);
						add(cameraTarget, cdir, cameraTarget);
					} else {
						scale(cdir, 0.5, cdir);
						sub(cameraTarget, cdir, cameraTarget);
					}
				}
				forceRedraw = true;
			}
			mouse[0] = ev.layerX;
			mouse[1] = glc.offsetHeight-ev.layerY;
		};


		var framesPerSecond = 12;

		var motionVector = vec3();
		var rollSpeed = 0;
		var downMask = {};

		window.onkeydown = function(ev) {
			if (ev.ctrlKey) {
				return;
			}
			if (downMask[ev.keyCode]) return;
			downMask[ev.keyCode] = true;
			var char = String.fromCharCode(ev.keyCode).toLowerCase();
			switch(char) {
			case 'w':
				// Go forward
				motionVector[2] += 1;
				break;
			case 's':
				// Go backward
				motionVector[2] += -1;
				break;
			case 'a':
				// Go left
				motionVector[0] += -1;
				break;
			case 'd':
				// Go right
				motionVector[0] += 1;
				break;
			case 'r':
				// Go up
				motionVector[1] += 1;
				break;
			case 'f':
				// Go down
				motionVector[1] += -1;
				break;
			case 'e':
				rollSpeed += 1;
				break;
			case 'q':
				rollSpeed += -1;
				break;
			default:

			}
			forceRedraw = true;
		};

		window.onkeyup = function(ev) {
			if (!downMask[ev.keyCode]) return;
			downMask[ev.keyCode] = false;
			var char = String.fromCharCode(ev.keyCode).toLowerCase();
			switch(char) {
			case 'w':
				// Go forward
				motionVector[2] -= 1;
				break;
			case 's':
				// Go backward
				motionVector[2] -= -1;
				break;
			case 'a':
				// Go left
				motionVector[0] -= -1;
				break;
			case 'd':
				// Go right
				motionVector[0] -= 1;
				break;
			case 'r':
				// Go up
				motionVector[1] -= 1;
				break;
			case 'f':
				// Go down
				motionVector[1] -= -1;
				break;
			case 'c':
				addKeyframe();
				break;
			case 'z':
				if (ev.shiftKey) {
					goToPreviousKeyframe();
				} else if (ev.altKey) {
					goToBeginning();
				} else {
					goToPreviousFrame();						
				}
				break;
			case 'x':
				if (ev.shiftKey) {
					goToNextKeyframe();
				} else if (ev.altKey) {
					goToEnd();
				} else {
					goToNextFrame();
				}
				break;
			case 'e':
				rollSpeed -= 1;
				break;
			case 'q':
				rollSpeed -= -1;
				break;
			default:
				if (ev.keyCode === 32) {
					ev.preventDefault();
					play();
				}
			}
			forceRedraw = true;
		};

		document.querySelector('.timeline .play').addEventListener('click', function(ev) {
			ev.preventDefault();
			play();
			forceRedraw = true;
		}, false);

		document.querySelector('.timeline .previous-frame').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToPreviousFrame();
			forceRedraw = true;
		}, false);

		document.querySelector('.timeline .previous-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToPreviousKeyframe();
			forceRedraw = true;
		}, false);

		document.querySelector('.timeline .rewind').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToBeginning();
			forceRedraw = true;
		}, false);

		document.querySelector('.timeline .next-frame').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToNextFrame();
			forceRedraw = true;
		}, false);
		
		document.querySelector('.timeline .next-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToNextKeyframe();
			forceRedraw = true;
		}, false);

		document.querySelector('.timeline .fast-forward').addEventListener('click', function(ev) {
			ev.preventDefault();
			goToEnd();
			forceRedraw = true;
		}, false);

		var eot = { downX: null };
		document.querySelector('.end-of-time').addEventListener('mousedown', function(ev) {
			ev.preventDefault();
			eot.downX = ev.clientX;
			forceRedraw = true;
		}, false);

		window.addEventListener('mousemove', function(ev) {
			if (eot.downX !== null) {
				ev.preventDefault();
				var delta = (ev.clientX - eot.downX);
				eot.downX = ev.clientX;
				animationDuration += delta / (framesPerSecond * 8);
				scrollIntoViewIfNeeded(document.querySelector('.end-of-time'));
				updateKeyframes();
				forceRedraw = true;
			}
		}, false);

		window.addEventListener('mouseup', function(ev) {
			if (eot.downX !== null) {
				ev.preventDefault();
				eot.downX = null;
				animationDuration = Math.round(animationDuration * framesPerSecond) / framesPerSecond;
				updateKeyframes();
				forceRedraw = true;
			}
		}, false);

		document.querySelector('.new-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			addKeyframe();
			forceRedraw = true;
		}, false);

		document.querySelector('.delete-keyframe').addEventListener('click', function(ev) {
			ev.preventDefault();
			deleteSelectedKeyframe();
			forceRedraw = true;
		}, false);

		document.querySelector('.delete-all-keyframes').addEventListener('click', function(ev) {
			ev.preventDefault();
			deleteAllKeyframes();
			forceRedraw = true;
		}, false);

		var objectSelect = document.querySelector('.object-select select');

		objectSelect.addEventListener('change', function(ev) {
			setCurrentObject(this.value);
			forceRedraw = true;
		}, false);

		objectSelect.addEventListener('keydown', function(ev) {
			ev.preventDefault();
		}, false);

		objectSelect.addEventListener('keyup', function(ev) {
			ev.preventDefault();
		}, false);

		var curveEditor = document.querySelector('.curve-editor svg');
		draggableCurve(curveEditor, function() {
			if (selectedKeyframe === null) {
				return [0, 0, 0.25, 0.25, 0.75, 0.75, 1, 1];
			}
			return selectedKeyframe.tweenCurve;
		});

		var selectedKeyframe = null;

		var resizeCurve = function() {
			plotFCurve(document.querySelector('.curve-editor svg'), recording, framesPerSecond, animationDuration);
		};

		window.addEventListener('resize', resizeCurve, false);

		var svg = document.querySelector('.curveEditorCanvas');
		var fcc = svg.querySelector('.f-curve-container');

		svg.addEventListener('mousedown', function(ev) {
			ev.preventDefault();
			if (ev.target.tagName.toLowerCase() === 'svg') {
				svg.down = true;
				svg.sx = ev.clientX;
				svg.sy = ev.clientY;
				forceRedraw = true;
			}
		}, false);

		window.addEventListener('mousemove', function(ev) {
			if (svg.down) {
				ev.preventDefault();
				var dx = ev.clientX - svg.sx;
				var dy = ev.clientY - svg.sy;
				svg.sx = ev.clientX;
				svg.sy = ev.clientY;
				var m = fcc.getCTM();
				// m.e += dx;
				m.f += dy;
				fcc.transform.baseVal.initialize(fcc.transform.baseVal.createSVGTransformFromMatrix(m));
				forceRedraw = true;
			}
		}, false);

		window.addEventListener('mouseup', function(ev) {
			if (svg.down) {
				ev.preventDefault();
				svg.down = false;
				forceRedraw = true;
			}
		}, false);

		// svg.addEventListener('wheel', function(ev) {
		// 	ev.preventDefault();
		// 	var df = Math.pow(1.001, ev.deltaY);
		// 	var m = fcc.getCTM();
		// 	m.d *= df;
		// 	fcc.transform.baseVal.initialize(fcc.transform.baseVal.createSVGTransformFromMatrix(m));
		// });

		var setSelectedKeyframe = function(kf) {
			selectedKeyframe = kf;
			plotFCurve(document.querySelector('.curve-editor svg'), recording, framesPerSecond, animationDuration);
		};

		var deselectKeyframe = function(kf) {
			selectedKeyframe = null;
			plotFCurve(document.querySelector('.curve-editor svg'), recording, framesPerSecond, animationDuration);
		};

		var setCurrentObject = function(name) {
			document.querySelector('.object-select select').value = name;
			recording = timeline[name];
			currentObject = scene[name];
			var index = getCurrentKeyframeIndex();
			if (index !== null) {
				setSelectedKeyframe(recording[0]);
			} else {
				deselectKeyframe();
			}
			updateKeyframes();
		};

		var goToBeginning = function() {
			animationTime = 0;
		};

		var goToEnd = function() {
			animationTime = animationDuration;
		};

		var addKeyframe = function(kf) {
			if (!kf) {
				kf = {};
				var fCurves = {};
				var tweenCurves = {};
				kf.time = Math.floor(animationTime * (framesPerSecond)) / (framesPerSecond);
				kf.tweenCurves = tweenCurves;
				kf.fCurves = fCurves;
				for (var i in currentObject) {
					if (specialKeys[i]) { 
						continue;
					}
					kf[i] = [].slice.call(currentObject[i]);
					fCurves[i] = kf[i].map(function(k) {
						return [-3/framesPerSecond, 0, +3/framesPerSecond, 0];
					});
					tweenCurves[i] = kf[i].map(function(k) { return [0, 0, 0.25, 0.25, 0.75, 0.75, 1, 1]; });
				}
			}
			var added = false;
			for (var i=0; i<recording.length; i++) {
				if (recording[i].time > kf.time) {
					var d = 0;
					if (i > 0 && recording[i-1].time === kf.time) {
						d = 1;
						i--;
					}
					recording.splice(i, d, kf);
					added = true;
					break;
				}
			}
			if (!added) {
				if (recording.length > 0 && recording[recording.length-1].time === kf.time) {
					recording.pop();
				}
				recording.push(kf);
			}
			if (recording.length === 1 && kf.time !== 0) {
				var zeroKf = {};
				for (var i in kf) {
					zeroKf[i] = kf[i];
				}
				zeroKf.time = 0;
				recording.unshift(zeroKf);
			}
			setSelectedKeyframe(kf);
			smoothKeyframes();
			updateKeyframes();
		};

		var smoothKeyframes = function() {
			var px, py, nx, ny, kf, x;
			for (var i=1; i<recording.length-1; i++) {
				kf = recording[i];
				x = kf.time;
				var curves = kf.fCurves;
				for (var key in curves) {
					for (var j = 0; j < curves[key].length; j++) {
						var curve = curves[key][j];
						if (curve.manual) {
							continue;
						}
						px = recording[i-1].time;
						py = recording[i-1][key][j];
						nx = recording[i+1].time;
						ny = recording[i+1][key][j];
						var dx = nx-px;
						var dy = ny-py;
						var d = Math.abs(dx);
						var d1 = Math.abs(x-px);
						var d2 = Math.abs(nx-x);
						var md = Math.min(d1, d2);
						md = 0.33 * md / d;
						curve[0] = - dx * md;
						curve[1] = - dy * md;
						curve[2] = + dx * md;
						curve[3] = + dy * md;
					}
				}
			}
		};

		var modifyKeyframe = function(keyframe, modifications) {
			if (deleteKeyframe(keyframe)) {
				for (var i in modifications) {
					keyframe[i] = modifications[i];
				}
				addKeyframe(keyframe);
			}
		};

		var deleteKeyframe = function(keyframe) {
			var idx = recording.indexOf(keyframe);
			if (idx > -1) {
				recording.splice(idx, 1);
				return true;
			}
			return false;
		};

		var deleteSelectedKeyframe = function() {
			if (selectedKeyframe) {
				deleteKeyframe(selectedKeyframe);
				deselectKeyframe();
				updateKeyframes();			
			}
		};

		var deleteAllKeyframes = function() {
			recording.splice(0);
			deselectKeyframe();
			updateKeyframes();
		};

		var play = function() {
			playing = !playing;
			forceRedraw = true;
		};

		var getCurrentKeyframeIndex = function() {
			if (recording.length === 0) {
				return null;
			}
			var kf = 0;
			for (var i=1; i<recording.length; i++) {
				if (recording[i].time > animationTime) {
					break;
				}
				kf = i;
			}
			return kf;
		};

		var goToNextFrame = function() {
			animationTime = Math.floor(animationTime * framesPerSecond + 1) / framesPerSecond;
			if (animationTime > animationDuration) {
				animationTime = animationDuration;
			}
		};

		var goToPreviousFrame = function() {
			animationTime = Math.floor(animationTime * framesPerSecond - 1) / framesPerSecond;
			if (animationTime < 0) {
				animationTime = 0;
			}
		};

		var goToNextKeyframe = function() {
			var idx = getCurrentKeyframeIndex();
			if (idx !== null && idx < recording.length-1) {
				animationTime = recording[idx+1].time;
			}
		};

		var goToPreviousKeyframe = function() {
			var idx = getCurrentKeyframeIndex();
			if (idx !== null) {
				if (idx > 0 && recording[idx].time + (playing ? 0.5 : 0) >= animationTime) {
					animationTime = recording[idx-1].time;
				} else {
					animationTime = recording[idx].time;
				}
			}
		};

		var goToTimeStripTime = function(ev, moving) {
			var frame = ((ev.clientX - timeStrip.getBoundingClientRect().left) / 8);
			var timeInSeconds = frame / framesPerSecond;

			if (!moving && ev.target.classList.contains('keyframe')) {
				animationTime = ev.target.time;
				setSelectedKeyframe(ev.target.keyframe);
				updateKeyframes();
			} else {
				if (downKeyframe !== null) {
					selectedKeyframe = downKeyframe;
					modifyKeyframe(downKeyframe, {time: Math.round(frame) / framesPerSecond});
					timeInSeconds = downKeyframe.time;
					updateKeyframes();
				} else {
					if (selectedKeyframe !== null) {
						deselectKeyframe();
						updateKeyframes();
					}
				}
				animationTime = Math.max(0, timeInSeconds);
			}
			ev.preventDefault();
		};

		var timeStrip = document.querySelector('.timestrip');
		var downKeyframe = null;
		var clipboardKeyframe = null;

		var copyKeyframe = function() {
			clipboardKeyframe = selectedKeyframe;
		};

		var objectCopy = function(o) {
			if (typeof o === 'object') {
				var res;
				if (Array.prototype.isPrototypeOf(o)) {
					res = o.map(objectCopy);
				} else {
					res = {};
					for (var i in o) {
						res[i] = objectCopy(o[i]);
					}
				}
				return res;
			} else {
				return o;
			}
		}

		var pasteKeyframe = function() {
			if (!selectedKeyframe) {
				addKeyframe();
			}
			if (clipboardKeyframe) {
				for (var i in clipboardKeyframe) {
					if (i !== 'time') {
						selectedKeyframe[i] = objectCopy(clipboardKeyframe[i]);
					}
				}
			}
			smoothKeyframes();
			updateKeyframes();
		};

		timeStrip.addEventListener('mousedown', function(ev) {
			ev.preventDefault();
			if (!ev.target.classList.contains('end-of-time')) {
				if (ev.target.classList.contains('keyframe')) {
					downKeyframe = ev.target.keyframe;
				}
				this.down = true;
				goToTimeStripTime(ev, false);
				forceRedraw = true;
			}
		}, false);

		var closeMenu = function() {
			var oldMenus = [].slice.call(document.querySelectorAll('.contextmenu'));
			for (var i=0; i<oldMenus.length; i++) {
				oldMenus[i].parentNode.removeChild(oldMenus[i]);
			}
			var oldMenus = [].slice.call(document.querySelectorAll('.contextmenu-background'));
			for (var i=0; i<oldMenus.length; i++) {
				oldMenus[i].parentNode.removeChild(oldMenus[i]);
			}
		};

		var contextMenu = function(x, y, items) {
			var menu = document.createElement('div');
			menu.className = 'contextmenu';
			document.body.appendChild(menu);
			var bg = document.createElement('div');
			bg.className = 'contextmenu-background';
			document.body.appendChild(bg);
			bg.onclick = function(ev) {
				closeMenu();
			};
			items.forEach(function(it) {
				var name = it[0];
				var action = it[1];
				var menuItem = document.createElement('div');
				if (name === '-') {
					menuItem.classList.add('spacer');
				} else {
					menuItem.textContent = name;
				}
				if (action) {
					menuItem.onclick = function(ev) {
						action(ev);
						closeMenu();
						ev.preventDefault();
					};
				} else {
					menuItem.classList.add('disabled');
				}
				menu.appendChild(menuItem);
			});
			var bbox = menu.getBoundingClientRect();
			if (x + bbox.width > window.innerWidth) {
				menu.style.right = (window.innerWidth-x) + 'px';
			} else {
				menu.style.left = x + 'px';
			}
			if (y + bbox.height > window.innerHeight) {
				menu.style.bottom = (window.innerHeight-y) + 'px';
			} else {
				menu.style.top = y + 'px';				
			}
		};

		timeStrip.addEventListener('contextmenu', function(ev) {
			var menuItems = [
				['Copy', selectedKeyframe ? copyKeyframe : null],
				['Paste', clipboardKeyframe ? pasteKeyframe : null],
			];
			if (selectedKeyframe) {
				menuItems.push(
					['-'],
					['Delete', deleteSelectedKeyframe]
				);
			}
			contextMenu(ev.clientX, ev.clientY, menuItems);
			ev.preventDefault();
		}, false);

		window.addEventListener('mousemove', function(ev) {
			if (timeStrip.down) {
				ev.preventDefault();
				goToTimeStripTime(ev, true);
				forceRedraw = true;
			}
		}, false);

		window.addEventListener('mouseup', function(ev) {
			if (timeStrip.down) {
				ev.preventDefault();
				timeStrip.down = false;
				downKeyframe = null;
				forceRedraw = true;
			}
		}, false);

		var updateKeyframes = function() {
			var timeStrip = document.querySelector('.timestrip .keyframes');
			timeStrip.innerHTML = '';
			for (var i=0; i<recording.length; i++) {
				var kf = document.createElement('div');
				kf.className = 'keyframe';
				if (selectedKeyframe === recording[i]) {
					kf.className += ' selected';
				}
				kf.time = recording[i].time;
				kf.keyframe = recording[i];
				kf.style.left = (
					recording[i].time // seconds
					* framesPerSecond // fps
					* 8 // keyframe width
				) + 'px';
				timeStrip.appendChild(kf);
			}
			document.querySelector('.end-of-time').style.left = ((animationDuration * framesPerSecond + 1) * 8) + 'px';
			document.querySelector('.active-time').style.width = ((animationDuration * framesPerSecond + 1) * 8) + 'px';
			plotFCurve(document.querySelector('.curve-editor svg'), recording, framesPerSecond, animationDuration);
		};

		var getKeyframes = function(recording, animationTime) {
			if (recording.length === 0) {
				return null;
			}
			var f0 = recording[0], f1 = f0;
			if (f0.time < animationTime) {
				for (var i = 1; i < recording.length; i++) {
					f1 = recording[i];
					if (recording[i].time > animationTime) {
						break;
					}
					f0 = f1;
				}
			}
			var f = (animationTime - f0.time) / (f1.time - f0.time);
			f = Math.min(1, Math.max(0, isNaN(f) ? 0 : f));

			return {start: f0, end: f1, tweenPosition: f};
		};

		var interpolateKeyframes = function(keyName, startFrame, endFrame, t, target) {
			var v0 = startFrame[keyName];
			var v1 = endFrame[keyName];
			var dst = target[keyName];
			var timeFactor = 1 / (endFrame.time - startFrame.time);
			if (endFrame.time <= startFrame.time) {
				timeFactor = 0;
			}
			var curve = [];
			for (var i=0; i<v0.length; i++) {
				var ct = curvePoint(t, startFrame.tweenCurves[keyName][i]);
				var sp = startFrame.fCurves[keyName][i];
				var ep = endFrame.fCurves[keyName][i];
				curve[0] = 0;
				curve[1] = v0[i];
				curve[2] = ((startFrame.time + sp[2]) - startFrame.time) * timeFactor;
				curve[3] = v0[i] + sp[3];
				curve[4] = ((endFrame.time + ep[0]) - startFrame.time) * timeFactor;
				curve[5] = v1[i] + ep[1];
				curve[6] = 1;
				curve[7] = v1[i];
				var cp = curvePoint(ct, curve);
				dst[i] = cp;
			}
		};

		var applyTimeline = function(timeline, target, animationTime) {
			var kfs = getKeyframes(timeline, animationTime);
			if (kfs !== null) {
				for (var i in kfs.start) {
					if (!specialKeys[i]) {
						interpolateKeyframes(i, kfs.start, kfs.end, kfs.tweenPosition, target);
					}
				}
			}
		};

		var applyTimelines = function(animationTime) {
			for (var key in timeline) {
				if (key === 'Camera' && currentObject !== scene['Camera']) {
					continue;
				}
				applyTimeline(timeline[key], scene[key], animationTime);
			}
		};

		window.onresize = resize;

		var blurred = false;
		window.onblur = function() {
			blurred = true;
		};
		window.onfocus = function() {
			blurred = false;
		};

		var spheres = [];
		var contentContainer = document.querySelector('.content-3d');
		for (j=0; j<9; j++) {
			spheres[j] = {
				position: new Float32Array([Math.random()*10-5,Math.random()*10-5,Math.random()*10-5,1])
			};
			var div = document.createElement('div');
			div.innerHTML = "<h3>Title " + j + "</h3><p>This is some text.</p>";
			contentContainer.appendChild(div);
			spheres[j].html = div;
		}

		if (DEBUG) console.log('WebGL setup total: '+(Date.now()-t1)+' ms'); 

		var lightPos = vec3(-8.5, 3.5, 5.4);

		var cameraPos = new Float32Array([0,0, -13, 0]); // xyz, roll angle
		var previousCameraPos = new Float32Array([0,0, -13, 0]); // xyz, roll angle
		var cameraPosV = new Float32Array(4); // xyz, roll angle
		var cameraTarget = new Float32Array([0,0,0,1]); // xyz, zoom
		var previousCameraTarget = new Float32Array([0,0,0,1]); // xyz, zoom
		var cameraTargetV = new Float32Array([0,0,0,0]); // xyz, zoom
		var cx0, cy0, cz0;
		var x0,y0,z0,r0, i,j;
		var cdir = vec3(0.0);
		var cpos = vec3(0.0);
		var target = -2;

		var playing = false;
		var t = 0, pt = 0, dt = 0;
		var animationTime = 0;
		var previousAnimationTime = 0;
		var animationDuration = 5;

		var scene = {};
		scene.Sky = {id: -2, position: lightPos};
		scene.Camera = {id: -2, position: cameraPos, target: cameraTarget};
		for (var i=0; i<spheres.length; i++) {
			scene["Sphere " + i] = {id: i, position: spheres[i].position};
		}

		var timeline = {};
		for (var i in scene) {
			timeline[i] = [];
		}
		if (savedTimeline) {
			try {
				timeline = JSON.parse(savedTimeline);
				animationDuration = 5.75;
				applyTimelines(0);
			} catch (e) {
				e;
				// do nothing
			}
		}

		var recording, currentObject;
		setCurrentObject('Camera');

		pt = t = performance.now() / 1000;
		var tick = function() {
			forceRedraw = forceRedraw || (dot(motionVector, motionVector) + rollSpeed*rollSpeed);
			// forceRedraw = forceRedraw || down;
			if ((!blurred && (playing || forceRedraw)) || (playing && window.noOnBlurPause)) {
				forceRedraw = false;
				if (window.startScript) {
					if (window.performance && performance.timing && performance.timing.navigationStart) {
						console.log('navigationStart to first frame: '+(Date.now()-performance.timing.navigationStart)+' ms');
					}
					console.log('script start to first frame: '+(Date.now()-window.startScript)+' ms');
					window.startScript = 0;
				}

				t = performance.now() / 1000;
				dt = t-pt;
				pt = t;

				var updateMotionBlur = false;
				var updateCameraMotionBlur = false;

				var playhead = document.querySelector('.playhead');
				if (playhead) {
					playhead.style.left = Math.floor(animationTime * framesPerSecond) * 8 + 'px';
					if (playing) {
						scrollIntoViewIfNeeded(playhead);
					}
				}

				if (playing || animationTime !== previousAnimationTime) {

					if (playing && animationTime > animationDuration) {
						animationTime = 0;
					}

					applyTimelines(animationTime);

					if (playing) {
						animationTime += dt;
					}

					previousAnimationTime = animationTime;

					updateMotionBlur = true;
					updateCameraMotionBlur = true;

				} else {

					xyz(up, Math.sin(cameraPos[3]), Math.cos(cameraPos[3]), 0);
					normalize(sub(cameraTarget, cameraPos, zaxis));
					normalize(cross(up, zaxis, xaxis));
					normalize(cross(zaxis, xaxis, yaxis));
					cdir[0] = dot([xaxis[0], yaxis[0], zaxis[0]], motionVector);
					cdir[1] = dot([xaxis[1], yaxis[1], zaxis[1]], motionVector);
					cdir[2] = dot([xaxis[2], yaxis[2], zaxis[2]], motionVector);

					scale(cdir, 10*dt, cdir);

					add(cameraPos, cdir, cameraPos);
					add(cameraTarget, cdir, cameraTarget);

					cameraPos[3] += rollSpeed * dt;

					if (length(cdir) > 0 || rollSpeed > 0) {
						updateCameraMotionBlur = true;
					}
					
				}

				if (playing) {
					document.body.classList.add('playing');
				} else {
					document.body.classList.remove('playing');
				}

				var moved = 0;
				for (j=0; j<9; j++) {
					i = j*4;
					x0 = posTex[i];
					y0 = posTex[i+1];
					z0 = posTex[i+2];
					r0 = posTex[i+3];
					posTex[i] = spheres[j].position[0];
					posTex[i+1] = spheres[j].position[1];
					posTex[i+2] = spheres[j].position[2];
					posTex[i+3] = spheres[j].position[3];
					//if (updateMotionBlur) {
						moved |= posTex[i+16*4] = (posTex[i]-x0)/dt;
						moved |= posTex[i+16*4+1] = (posTex[i+1]-y0)/dt;
						moved |= posTex[i+16*4+2] = (posTex[i+2]-z0)/dt;
						moved |= posTex[i+16*4+3] = (posTex[i+3]-r0)/dt;
					//}
					var el = spheres[j].html;
					trackElement(el, spheres[j].position, cameraPos, cameraTarget);
				}
				updateTexture(gl, pTex, posTex, 1);

				//if (updateCameraMotionBlur) {
					cameraPosV[0] = (cameraPos[0]-previousCameraPos[0])/dt;
					cameraPosV[1] = (cameraPos[1]-previousCameraPos[1])/dt;
					cameraPosV[2] = (cameraPos[2]-previousCameraPos[2])/dt;
					cameraPosV[3] = (cameraPos[3]-previousCameraPos[3])/dt;
					previousCameraPos.set(cameraPos);
					cameraTargetV[0] = (cameraTarget[0]-previousCameraTarget[0])/dt;
					cameraTargetV[1] = (cameraTarget[1]-previousCameraTarget[1])/dt;
					cameraTargetV[2] = (cameraTarget[2]-previousCameraTarget[2])/dt;
					cameraTargetV[3] = (cameraTarget[3]-previousCameraTarget[3])/dt;
					previousCameraTarget.set(cameraTarget);
				//}

				var cameraMoved = dot(cameraPosV, cameraPosV) || dot(cameraTargetV, cameraTargetV);
				forceRedraw = cameraMoved || moved;
				if (cameraMoved || playing || moved) {
					setAnimShader();
				} else {
					setStaticShader();
				}

				u4fv(gl, p, 'iCamera', cameraPos);
				u4fv(gl, p, 'iCameraTarget', cameraTarget);
				u4fv(gl, p, 'iCameraV', cameraPosV);
				u4fv(gl, p, 'iCameraTargetV', cameraTargetV);

				u3fv(gl, p, 'iLightPos', lightPos);

				u1i(gl, p, 'iUseFourView', useFourView ? 1 : 0);

				u1f(gl, p, 'iGlobalTime', animationTime);
				u1f(gl, p, 'iPick', currentObject.id);
				u1f(gl, p, 'iISO', 200.0);
				u1f(gl, p, 'iShutterSpeed', 1/120);
				u1f(gl, p, 'iExposureCompensation', +0);
				u4fv(gl, p, 'iMouse', mouse);

				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				gl.drawArrays(gl.TRIANGLES, 0, 6);
			} else {
				t = performance.now() / 1000;
				dt = t-pt;
				pt = t;
			}
			requestAnimationFrame(tick, glc);
		};
		resize();
		tick();
		document.body.appendChild(glc);
	});
};

var ticker = function() {
	if (window.gl && window.curvePoint && window.createTexture) {
		init();
	} else {
		setTimeout(ticker, 0);
	}
};
ticker();

})();

