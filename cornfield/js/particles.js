var particles = new THREE.Object3D();
for (var i=0; i<300; i++) {
	var particle = new THREE.Mesh(
		new THREE.BoxGeometry(0.2, 0.2, 0.2),
		new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.3, transparent: true, blending: THREE.AdditiveBlending})
	);
	particle.position.y = 15 + Math.random()*15;
	particle.position.x = 8 * (Math.random()*60-30);
	particle.position.z = Math.random()*30;
	particle.energy = 100 + Math.random()*100;
	particle.acceleration = new THREE.Vector3();
	particle.velocity = new THREE.Vector3();
	particles.add(particle);
}

var particleMode = 'fireflies';

var updateParticles = function() {

	var sun = shaderMat.uniforms.ufSunPosition.value;
	if (sun > 1.15 && sun < 1.49) {
		particleMode = 'fireflies';
	} else if (sun > 0.1 && sun < 1.1) {
		particleMode = 'seeds';
	} else if (sun > 1.5 && sun < 1.9) {
		particleMode = 'stars';
	} else {
		particleMode = 'none';
	}

	for (var i=0; i<particles.children.length; i++) {
		var particle = particles.children[i];

		switch (particleMode) {
			case 'seeds':
				particle.velocity.set(
					0.5*Math.cos(rainShaderMat.uniforms.ufWindDirection.value)*rainShaderMat.uniforms.ufWindStrength.value,
					0.03,
					0.5*Math.sin(rainShaderMat.uniforms.ufWindDirection.value)*rainShaderMat.uniforms.ufWindStrength.value
				);
				particle.position.add(particle.velocity);
				particle.rotation.x += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.rotation.y += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.rotation.z += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				if (particle.position.y > 45 || Math.abs(particle.position.x) > 7*30 || particle.position.z > camera.position.z) {
					particle.scale.x = particle.scale.y = particle.scale.z = Math.random()*0.5+0.5; 
					particle.position.y = 10;
					particle.position.x = 7 * (Math.random()*60-30);
					particle.position.z = Math.random()*30;
				}
				particle.material.opacity = 0.1*0.2*Math.min(5, Math.abs(particle.position.y-10), Math.abs(particle.position.y-45)) * (1+0.3*Math.sin(animationTime*2));
				if (rainShaderMat.uniforms.ufRainAmount.value > 0) {
					particle.material.opacity = 0;
				}
				break;

			case 'fireflies':
				if (particle.energy > 0) {
					particle.acceleration.set(0.01*(0.5-Math.random()), 0.001*(0.7-Math.random()), 0.01*(0.5-Math.random()));
				} else if (particle.energy > -50) {
					particle.acceleration.set(0, 0.001*(15-particle.position.y > 0 ? 1 : -1), 0);
				} else {
					particle.energy = 100 + Math.random()*100;
				}
				particle.energy--;
				particle.velocity.multiplyScalar(0.99);
				particle.velocity.add(particle.acceleration);
				particle.position.add(particle.velocity);
				particle.rotation.x += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.rotation.y += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.rotation.z += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				if (particle.position.z > 40) particle.position.z = Math.random()*30;
				particle.material.opacity = 0.2 * (1+0.3*Math.sin(animationTime*2));
				if (rainShaderMat.uniforms.ufRainAmount.value > 0) {
					particle.material.opacity = 0;
				}
				break;

			case 'stars':
				particle.velocity.set(
					Math.cos(particle.position.x)*1.5,
					-0.5,
					-Math.sin(particle.position.x)*1.5
				);
				particle.position.add(particle.velocity);
				particle.rotation.x += 0.05;
				particle.rotation.y += 0.05;
				particle.rotation.z += 0.05;
				if (particle.position.y < 15) {
					particle.scale.x = particle.scale.y = particle.scale.z = Math.random()*0.5+0.5; 
					particle.position.y = 45 + Math.random()*45;
					particle.position.x = 10 * (Math.random()*60-30);
					particle.position.z = Math.random()*30;
				}
				particle.material.opacity = 0.8*0.2*Math.min(5, Math.abs(particle.position.y-15), Math.abs(particle.position.y-45)) * (1+0.3*Math.sin(animationTime*100+i));
				particle.material.opacity *= 1.0 - cornShaderMat.uniforms.ufCloudCover.value;
				break;

			default:
				particle.position.add(particle.velocity);
				particle.rotation.x += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.rotation.y += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.rotation.z += 0.5*rainShaderMat.uniforms.ufWindStrength.value;
				particle.material.opacity *= 0.9;
				if (particle.material.opacity < 0.01) {
					particle.velocity.set(0,0,0);
				}

		}
	}

};
