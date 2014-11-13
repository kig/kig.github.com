precision highp float;

uniform sampler2D iChannel1;

uniform vec3 iResolution;
uniform vec3 iCamera;
uniform vec3 iCameraTarget;

uniform float iObjectCount;

attribute vec2 aPosition;

varying float vAnyObjectsVisible;
varying float vObjectVisible[3];

#define DF_EMPTY 0.0
#define DF_SPHERE 1.0
#define DF_BOX 2.0
#define DF_TORUS 3.0
#define DF_PRISM 4.0
#define DF_RING 5.0

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

mat4 transpose(mat4 inMatrix) {
	vec4 i0 = inMatrix[0];
	vec4 i1 = inMatrix[1];
	vec4 i2 = inMatrix[2];
	vec4 i3 = inMatrix[3];

	mat4 outMatrix = mat4(
		vec4(i0.x, i1.x, i2.x, i3.x),
		vec4(i0.y, i1.y, i2.y, i3.y),
		vec4(i0.z, i1.z, i2.z, i3.z),
		vec4(i0.w, i1.w, i2.w, i3.w)
	);
	return outMatrix;
}

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
	mx = transpose(mx);
	mx[3] = vec4(0.0, 0.0, 0.0, 1.0);
	mx[3] = -mx*vec4(posT.xyz, 1.0);

	s.r = params.x;
	if (t == DF_BOX) s.r = length(params.xyz);
	if (t == DF_TORUS) s.r = sqrt(2.0)*(s.r + params.y);
	if (t == DF_PRISM) s.r = length(params.xy);
	if (t == DF_RING) s.r = sqrt(params.x*params.x + params.z*params.z);

	s.p = (mx * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
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
	gl_PointSize = 8.0;

	vec2 pixelAspect = vec2(iResolution.x / iResolution.y, 1.0);
	vec2 uv = -1.0 + 2.0 * (aPosition / iResolution.xy);

	gl_Position = vec4(uv, 0.0, 1.0);

	uv *= pixelAspect;

	ray r = setupRay(uv, 1.0);

	vAnyObjectsVisible = 0.0;
	for (int i=0; i<3; i++) {
		vObjectVisible[i] = 0.0;
		for (int j=0; j<8; j++) {
			if (float(i*8+j) >= iObjectCount) return;
			sphere s = getBoundingSphere(i*8+j);
			float bit = rayBV(r, s.p, s.r+0.2);
			vObjectVisible[i] += pow(2.0, float(j))*bit;
			vAnyObjectsVisible += bit;
		}
	}
}