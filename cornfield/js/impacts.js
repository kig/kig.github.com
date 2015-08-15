var impactFrames = 0;
var grassHeight = 1;
var scareBirds = false, attractBirds = false;
window.grassHeightModifier = 0.15;
window.addEventListener('keydown', function(ev) {
	if (ev.which === 38) // up
	{
		grassHeight += 0.1;
	}
	if (ev.which === 40) // down
	{
		grassHeight -= 0.1;
	}
	if (ev.which === 37)
	{
		scareBirds = true;
	}
	if (ev.which === 39)
	{
		attractBirds = true;
	}
	grassHeight = Math.max(Math.min(grassHeight, 2), 0);
}, false);

window.addEventListener('keyup', function(ev) {
	if (ev.which === 37) {
		scareBirds = false;
	}
	if (ev.which === 39) {
		attractBirds = false;
	}
}, false);

var impactTick = function() {
	if (clicked) {
		//impactFrames = 60;
	}
	if (impactFrames > 0) {
		var f = 0.5 - 0.5 * Math.cos(2*Math.PI*(impactFrames/60));
		cornShaderMat.uniforms.ufImpulse.value = f;
	}
	impactFrames--;
	cornShaderMat.uniforms.ufGrassHeight.value += 0.1 * (grassHeight-cornShaderMat.uniforms.ufGrassHeight.value) + Math.max(0.0, grassHeightModifier / 100 - 0.15);
};

