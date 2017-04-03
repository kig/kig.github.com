var Tline = function() {
	this.children = {};
	this.keyframes = [];
};

Tline.prototype = {
	addKeyframe: function(kf) {
		for (var i=0; i<this.keyframes.length; i++) {
			if (this.keyframes[i].time > kf.time) {
				this.keyframes.splice(i, 0, kf);
				return;
			}
		}
		this.keyframes.push(kf);
	},

	deleteKeyframe: function(kf) {
		var idx = this.keyframes.indexOf(kf);
		this.keyframes.splice(idx, 1);
	},

	getValue: function(time) {
		var kf0 = this.keyframes[0];
		if (!kf0) {
			return undefined;
		}
		if (kf0.time > time) {
			return kf0.tween(kf0.value, kf0.value, 0);
		}
		var kf1 = kf0;
		for (var i=1; i<this.keyframes.length; i++) {
			kf0 = kf1;
			kf1 = this.keyframes[i];
			if (kf1.time > time) {
				break;
			}
		}
		if (kf1.time < time) {
			return kf1.tween(kf1.value, kf1.value, 1);
		}
		return kf0.tween(kf0.value, kf1.value, (time - kf0.time) / (kf1.time - kf0.time));
	},

	getState: function(time) {
		var state = this.getValue(time);
		var newState = {
			value: state,
			children: {}
		};
		for (var i in this.children) {
			newState.children[i] = this.children[i].getState(time);
		}
		return newState;
	}
};

Tline.Keyframe = function(time, value, tween) {
	this.time = time;
	this.value = value;
	this.tween = tween || Tline.Tween.Sine;
};

Tline.Tween = {

	clamp: function(min, max, v) {
		if (v < min) {
			v = min;
		} else if (v > max) {
			v = max;
		}
		return v;
	},

	Linear: function(a, b, t) {
		t = Tline.Tween.clamp(0, 1, t);
		return a*(1-t) + b*t;
	},

	Sine: function(a, b, t) {
		t = Tline.Tween.clamp(0, 1, t);
		return Tline.Tween.Linear(a, b, 0.5 - 0.5 * Math.cos(t * Math.PI));
	}
};


var scene = new Tline();
var camera = new Tline();
var position = new Tline();
position.children.x = new Tline();
position.children.y = new Tline();
position.children.z = new Tline();

position.children.x.addKeyframe(new Tline.Keyframe(3, 2));
position.children.y.addKeyframe(new Tline.Keyframe(3, 8));
position.children.z.addKeyframe(new Tline.Keyframe(3, 4));

position.children.x.addKeyframe(new Tline.Keyframe(1, 4));
position.children.y.addKeyframe(new Tline.Keyframe(1, 2));
position.children.z.addKeyframe(new Tline.Keyframe(1, 6));

position.children.x.addKeyframe(new Tline.Keyframe(0, 0));
position.children.y.addKeyframe(new Tline.Keyframe(0, 0));
position.children.z.addKeyframe(new Tline.Keyframe(0, 0));

camera.children.position = position;
scene.children.camera = camera;

var sphere0 = new Tline();
var position = new Tline();
position.children.x = new Tline();
position.children.y = new Tline();
position.children.z = new Tline();
sphere0.children.position = position;
scene.children.sphere0 = sphere0;

JSON.stringify(scene.getState(1), null, 2)


