precision mediump float;
precision mediump int;

uniform vec3 iResolution;
uniform float iGlobalTime;
uniform float iRot;

struct material {
	vec3 transmit;
	vec3 light;
};

struct ray {
	vec3 p;
	vec3 d;
	material m;
};

struct sphere {
	vec3 p;
	float r;
	material m;
};


float raySphereDet(ray r, sphere s, float closestHit, inout float b)
{
	vec3 rc = r.p-s.p;  // 1
	float c = dot(rc, rc); // 1
	c -= s.r*s.r;    // 2?
	b = dot(r.d, rc);      // 1
	return b*b - c;        // 2?
}

float raySphere(ray r, sphere s, float closestHit)
{
	float b;
	float d = raySphereDet(r, s, closestHit, b); // 7
	float t = -b - sqrt(abs(d));
	float st = step(0.0, min(t,d));
	return mix(closestHit, t, st);
}

float cosTween(float t)
{
	return 0.5-0.5*cos(3.14159*t);
}

vec3 shadeBg(vec3 dir)
{
	float t = min(1.0, pow(iGlobalTime, 0.7)/3.0);
	vec3 lightPos_ = vec3(
		cos(iRot-3.14159/4.0)*(0.7)+(1.0-cosTween(t))*-6.0,
		sin(iRot-3.14159/4.0)*(0.7)+(1.0-cosTween(t))*6.0,
		3.0
	);
	vec3 bgLight = normalize(lightPos_);
	vec3 lightPos = bgLight * 9999.0;
	vec3 sun = vec3(5.0, 3.5, 2.0)*4.0;

	vec3 bgCol = vec3(0.2, 0.15, 0.1);
	float bgDiff = dot(dir, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(dir, bgLight);
	bgCol += bgDiff*vec3(0.25, 0.5, 0.5);
	bgCol += sun*(0.0*pow( max(sunPow, 0.0), 2.0) + pow( max(sunPow, 0.0), 512.0));
	bgCol += bgCol*(pow( max(sunPow, 0.0), 128.0));
	return max(vec3(0.0), bgCol);
}


vec3 getDir(vec2 fragCoord)
{
	vec2 pixelAspect = vec2(iResolution.x / iResolution.y, 1.0);
	vec2 pixelRatio = vec2(2.0) / iResolution.xy;
	vec2 uv = (fragCoord*pixelRatio - 1.0)*pixelAspect;
	return normalize(vec3(uv, 1.0));
}

void main(void)
{
	vec3 nml = vec3(0.0);

	ray r;
	r.p = vec3(0.0, 0.0, -10.0);
	r.d = getDir(gl_FragCoord.xy);
	r.m.transmit = vec3(1.0);
	r.m.light = vec3(0.0);

	sphere s;
	s.p = vec3(0.0);
	s.r = 3.0;
	s.m.transmit = vec3(1.0);
	s.m.light = vec3(0.0);

	float d = raySphere(r, s, 1e5);
	if (d < 1e5) {
		r.p += r.d*d;
		vec3 nml = normalize(s.p-r.p);
		float f = pow(1.0 - clamp(0.0, 1.0, dot(nml, r.d)), 1.0);
		r.d = mix(reflect(r.d, nml), r.d, f);
		r.m.light += r.m.transmit * s.m.light;
		r.m.transmit *= s.m.transmit;
	}
	r.m.light += r.m.transmit * shadeBg(r.d);

	gl_FragColor = vec4( 1.0 - exp(-r.m.light * 2.0), 1.0 );
}