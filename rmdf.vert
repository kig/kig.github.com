precision highp float;

uniform sampler2D iChannel1;

uniform vec3 iResolution;
uniform vec3 iCamera;
uniform vec3 iCameraTarget;

uniform vec4 iBoundingSphere;

attribute vec3 position;

varying vec2 vUv;
varying float vAnyObjectsVisible;
varying float vObjectVisible[8];

struct ray
{
	vec3 p; // ray origin
	vec3 d; // ray direction
};

struct sphere
{
	vec3 p;
	float r;
};

sphere getBoundingSphere(int i) {
	sphere s;
	s.r = 0.0;

	vec4 posT = texture2D(iChannel1, vec2(float(i*5+4)/128.0, 0.0));
	float tm = posT.w;
	posT.w = 0.0;
	float t = floor(tm / 256.0);
	if (t == 0.0) return s;

	float m = floor(tm - t*256.0);
	vec4 params = texture2D(iChannel1, vec2(float(i*5)/128.0, 0.0));
	mat4 mx;
	mx[0] = texture2D(iChannel1, vec2(float(i*5+1)/128.0, 0.0));
	mx[1] = texture2D(iChannel1, vec2(float(i*5+2)/128.0, 0.0));
	mx[2] = texture2D(iChannel1, vec2(float(i*5+3)/128.0, 0.0));
	mx[3] = posT;

	s.r = params.x;
	if (t == 2.0) s.r = length(params.xyz);

	s.p = -posT.xyz;
	return s;
}

vec3 getDir(vec2 uv)
{
	vec3 up = vec3(0.0, 1.0, 0.0);
	vec3 zaxis = normalize(iCameraTarget - iCamera);
	vec3 xaxis = normalize(cross(up, zaxis));
	vec3 yaxis = cross(zaxis, xaxis);
	mat3 m;
	m[0] = xaxis;
	m[1] = yaxis;
	m[2] = zaxis;
	return m*normalize(vec3(uv, 1.0));
}

ray setupRay(vec2 uv, float k) {
	ray r;
	r.p = iCamera;
	r.d = getDir(uv);

	return r;
}

float rayBV(ray r, vec3 center, float radius)
{
	vec3 rc = r.p-center;
	float c = dot(rc, rc) - radius*radius;
	float b = dot(r.d, rc);
	float d = b*b - c;
	return step(0.0, d);
}

void main() {
	vec2 pixelAspect = vec2(iResolution.x / iResolution.y, 1.0);
	vUv = position.xy * pixelAspect;
	
	ray r = setupRay(vUv, 1.0);

	vAnyObjectsVisible = 0.0;
	for (int i=0; i<8; i++) {
		vObjectVisible[i] = 0.0;
		sphere s = getBoundingSphere(i);
		if (s.r > 0.0){
			vObjectVisible[i] = rayBV(r, s.p, s.r+0.5);
			vAnyObjectsVisible += vObjectVisible[i];
		}
	}

	gl_Position = vec4(position, 1.0);
}