var birds = new THREE.Object3D();

if (window.cornWorker) {
	birds.visible = false;
}

var birdMat = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0.0});
var leftWingGeo = new THREE.PlaneBufferGeometry(0.5, 0.15, 2, 1);
leftWingGeo.attributes.position.array[3*0 + 1] = -0.075;
leftWingGeo.attributes.position.array[3*3 + 1] = -0.05;
leftWingGeo.attributes.position.array[3*4 + 1] = 0.0;
var rightWingGeo = new THREE.PlaneBufferGeometry(0.5, 0.15, 2, 1);
rightWingGeo.attributes.position.array[3*0 + 1] = -0.075;
rightWingGeo.attributes.position.array[3*3 + 1] = -0.05;
rightWingGeo.attributes.position.array[3*4 + 1] = 0.0;
for (var i = 0; i < 30; i++) {
	birdMat.side = THREE.DoubleSide;
	var bird = new THREE.Object3D();
	var leftWing = new THREE.Mesh(
		leftWingGeo,
		birdMat
	);
	var rightWing = new THREE.Mesh(
		rightWingGeo,
		birdMat
	);
	leftWing.rotation.x = Math.PI/2;
	rightWing.rotation.x = Math.PI/2;
	leftWing.position.x = -0.25;
	rightWing.position.x = +0.25;
	bird.add(leftWing);
	bird.add(rightWing);
	bird.rotation.x = Math.PI/2;
	bird.position.set(
		Math.random()*200-100,
		Math.random()*10+10,
		Math.random()*20-10
	);
	bird.phase = Math.random()*Math.PI*2;
	bird.frequency = 4 + 1 * Math.random();
	bird.velocity = new THREE.Vector3(
		0.5-Math.random(),
		0.5-Math.random(),
		0.5-Math.random()
	);
	bird.velocity.normalize();
	bird.velocity.multiplyScalar(0.001);
	bird.scale.set(2.5,2.5,2.5);
	birds.add(bird);
}

var birdsTickTmpV = new THREE.Vector3(0,0,0);
var birdsCenter = new THREE.Vector3(0,0,0);
var birdsPhase = Math.random()*Math.PI*2;
var birdScareCounter = 0;
var birdsTick = function() {
	var sunPos = shaderMat.uniforms.ufSunPosition.value; // 0 = left = 6:00, 0.5 = up = 12:00, 1 = right = 18:00, 1.5 = down = 24:00
	if (sunPos < 0) {
		sunPos = 2+sunPos;
	}
	if (sunPos > 1 || shaderMat.uniforms.ufRainAmount.value > 0 || shaderMat.uniforms.ufWindStrength.value / 0.4 * 20 > 10) {
		birdScareCounter = 30;
		birdAttract = false;
	}
	if (sunPos > 1.1 && sunPos < 1.9) {
		birdMat.color.r += (1 - birdMat.color.r)*0.1;
		birdMat.color.g += (1 - birdMat.color.g)*0.1;
		birdMat.color.b += (1 - birdMat.color.b)*0.1;
		if (birds.visible) {
			birdMat.opacity += 0.05 * (0.5-birdMat.opacity);
		}
	} else {
		birdMat.color.r += (1 - birdMat.color.r)*0.1;
		birdMat.color.g += (1 - birdMat.color.g)*0.1;
		birdMat.color.b += (1 - birdMat.color.b)*0.1;		
		if (birds.visible) {
			birdMat.opacity += 0.05 * (0.8-birdMat.opacity);
		}
	}

	if (clicked) {
		birdScareCounter = 150;
	}

	if (birdScareCounter > 0) {
		birdScareCounter--;
	}

	birdsTickTmpV.set(
		Math.sin(birdsPhase+animationTime*0.06)*50,
		Math.cos(birdsPhase+animationTime*0.03)*30+40,
		Math.sin(birdsPhase+animationTime*0.065324)*10
	);
	birdsTickTmpV.subVectors(birdsTickTmpV, birdsCenter);
	birdsTickTmpV.multiplyScalar(0.1);
	birdsCenter.add(birdsTickTmpV);

	for (var i = 0; i < birds.children.length; i++) {
		var bird = birds.children[i];

		if ((birdScareCounter > 0 || scareBirds) && !attractBirds) {
			birdsTickTmpV.copy(bird.position);
			birdsTickTmpV.normalize();
			birdsTickTmpV.multiplyScalar(0.01);
			birdsTickTmpV.y = 0.001;
			bird.velocity.add(birdsTickTmpV);
		}
		if (bird.position.length() > 400 || attractBirds) {
			birdsTickTmpV.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5);
			bird.position.add(birdsTickTmpV);
			birdsTickTmpV.copy(bird.position);
			if (attractBirds) {
				birdsTickTmpV.z = -50;
			}
			birdsTickTmpV.y += 10;
			var len = birdsTickTmpV.length();
			birdsTickTmpV.normalize();
			birdsTickTmpV.multiplyScalar(-0.01 * Math.min(1, len/50));
			bird.velocity.add(birdsTickTmpV);
		}

		for (var j = i+1; j < birds.children.length; j++) {
			var ob = birds.children[i+1];
			birdsTickTmpV.subVectors(ob.position, bird.position);
			var d = birdsTickTmpV.length();
			if (d < 5*2.5) {
				birdsTickTmpV.normalize();
				birdsTickTmpV.multiplyScalar( Math.min( 0.001, 0.0002/(d/(5*2.5)) ) );
				ob.velocity.add(birdsTickTmpV);
				bird.velocity.sub(birdsTickTmpV);
			}
		}

		birdsTickTmpV.addVectors(bird.position, bird.velocity);
		bird.lookAt(birdsTickTmpV);

		birdsTickTmpV.multiplyScalar(0.01);
		birdsCenter.multiplyScalar(0.99);
		birdsCenter.add(birdsTickTmpV);

		birdsTickTmpV.subVectors(birdsCenter, bird.position);
		birdsTickTmpV.normalize();
		birdsTickTmpV.multiplyScalar(0.001);
		birdsTickTmpV.x *= 1.1;
		birdsTickTmpV.z *= 1.1;
		bird.velocity.add(birdsTickTmpV);

		if (bird.velocity.length > 0.001) {
			bird.velocity.normalize();
			bird.velocity.multiplyScalar(0.001);
		}

		birdsTickTmpV.copy(bird.velocity);
		birdsTickTmpV.multiplyScalar(2.5);

		bird.position.add(birdsTickTmpV);

		if (bird.position.y < 12) {
			bird.velocity.y += 0.005;
			bird.velocity.multiplyScalar(0.97);
		}
		if (bird.position.y < 4) {
			bird.position.y = 4;
			bird.velocity.multiplyScalar(-1);
		}

		bird.phase += (bird.velocity.length()/0.01)/60;

		bird.position.x = Math.max(Math.min(bird.position.x, 400), -400);
		bird.position.y = Math.max(Math.min(bird.position.y, 100), 8);
		bird.position.z = Math.max(Math.min(bird.position.z, 60), -60);

		var rot = Math.sin(bird.phase);
		bird.children[0].rotation.y = rot
		bird.children[1].rotation.y = Math.PI - rot;
		bird.children[0].position.x = -Math.cos(rot)*0.25; 
		bird.children[1].position.x = Math.cos(rot)*0.25;

	}
};