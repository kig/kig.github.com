precision highp float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform sampler2D iChannel0;
float     iWallTime = iGlobalTime;

#define THRESHOLD 0.01
#define MAX_DISTANCE 8.0

#define RAY_STEPS 120
#define MAX_SAMPLES 4.0

struct ray
{
	vec3 p; // ray origin
	vec3 d; // ray direction

	// how much light the ray allows to pass at this point
	vec3 transmit; // *= material.transmit

	// how much light has passed through the ray
	vec3 light;    // += ray.transmit * material.emit

};

struct mat
{
	vec3 transmit; // how much of the incoming light the material allows to pass
	vec3 emit;     // how much light the material emits
	float diffuse; // how much to scatter the reflections
};

// camera rotation
mat3 rotationXY( vec2 angle ) {
	// pitch
	float cp = cos( angle.x );
	float sp = sin( angle.x );
	// yaw
	float cy = cos( angle.y );
	float sy = sin( angle.y );

	return mat3(
		cy     , 0.0, -sy,
		sy * sp,  cp,  cy * sp,
		sy * cp, -sp,  cy * cp
	);
}

float hash( float n ) {
    return fract(sin(n)*43758.5453123);
}

vec2 hash2( float n )
{
    return fract(sin(vec2(n,n+1.0))*vec2(43758.5453123,22578.1459123));
}

vec3 hash3( float n )
{
    return fract(sin(vec3(n,n+1.0,n+2.0))*vec3(43758.5453123,22578.1459123,19642.3490423));
}

// iq's LUT-based 3D noise
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);

	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = texture2D( iChannel0, mod((uv + 0.5)/256.0, vec2(256.0)), -100.0 ).yx;
	return mix( rg.x, rg.y, f.z );
}

// cloud fBm with three noise samples, flow direction & exponential y-scale
float map( in vec3 p )
{
	p.y = pow(abs(p.y), 1.3);

	float d = -0.1 - p.y;

	vec3 dir = 8.0*normalize(p);
	dir.y = 0.0;
	vec3 q = p - dir+vec3(-0.0,3.0,-0.0)*(0.1*iWallTime);
	float f;
    f  = 0.6*noise( q ); q = q*3.01;
    f += 0.3*noise( q ); /*q = q*3.02;
    f += 0.1*noise( q );*/

	d += 3.5 * f;

	d = clamp( d, 0.0, 1.0 );

	return d;
}

float scene(vec3 p, mat3 mp)
{
	float cube = length(max(abs(mp*p - vec3(0.0, 0.0, 0.0)) - vec3(1.95), 0.0)) - 0.05;
	return cube;
}

mat material(vec3 p)
{
	mat m;
	m.emit = vec3(0.0);
	m.transmit = vec3(1.0);
    float n = min(1.0, pow(abs(p.z+0.0)*16.0, 2.0));
	m.transmit = vec3(1.1)*n; // 0.95, 0.7, 0.5);
	m.diffuse = 0.1+(1.0-sqrt(abs(n)));
	return m;
}

vec3 normal(ray r, float d, mat3 m)
{
	float e = 0.001;
	float dx = scene(vec3(e, 0.0, 0.0) + r.p, m) - d;
	float dy = scene(vec3(0.0, e, 0.0) + r.p, m) - d;
	float dz = scene(vec3(0.0, 0.0, e) + r.p, m) - d;
	return normalize(vec3(dx, dy, dz));
}

vec3 shadeBg(vec3 nml)
{
    vec3 lightPos_ = vec3(0.5, -1.5, 8.0);
    vec3 bgLight = normalize(lightPos_);
    vec3 lightPos = bgLight * 9999.0;
    vec3 sun = vec3(2.0)*4.0; //, 3.5, 2.0)*4.0;

    vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
    vec2 uv = (2.0 * gl_FragCoord.xy / iResolution.xy - 1.0) * aspect;

	vec3 bgColz = vec3(0.9);
	float bgDiff = dot(nml, vec3(0.0, -1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	float sp = max(sunPow, 0.0);
	vec3 bgCol = vec3(0.0);
	bgCol += max(0.0, bgDiff)*vec3(0.8);
	bgCol += max(0.0, -bgDiff)*vec3(1.25);
	bgCol += vec3(0.15)*( pow(1.0-abs(bgDiff), 6.0) );
	bgCol += sun*(0.02*pow( sp, 3.0) + pow( sp, 256.0));
	bgCol += bgColz*(pow( sp, 8.0) + pow( sp, abs(bgLight.y)*128.0));
    float t = cos(iWallTime*0.5) * sin(iWallTime*0.1);
	return (bgCol + 0.25) * map(dot(nml, vec3(0,0,1.0))*nml.yyz*vec3(1.0, 2.0, 0.0)+2.5*t) + 0.1*hash((iWallTime*0.5)+nml.x*1211.201+nml.z*2531.029+nml.y*2443.029+3289.02);
}

float shade(inout ray r, vec3 nml, float d)
{
	mat m = material(r.p);
	r.light += m.emit * r.transmit;
	r.transmit *= m.transmit;
	return m.diffuse;
}

vec2 xy(float k, float n)
{
	return vec2(floor(k/n), k-(floor(k/n)*n));
}

vec3 offset(vec3 dir, vec3 nml, float k, float count, float diffuse) {
	vec2 phiTheta = hash2(count) * 6.2831;
	float u = cos(phiTheta.x);
	float sq = sqrt(1.0 - u * u);
	float rx = sq * cos(phiTheta.y); 
	float ry = sq * sin(phiTheta.y);
	float rz = u;
	vec3 v = vec3(rx, ry, rz);
	return normalize(mix(dir, nml + v, diffuse));
}


ray setupRay(vec2 uv, float k) {
	mat3 rot = rotationXY( vec2( -0.11, 0.0 ));
	ray r;
	r.light = vec3(0.0);
	r.transmit = vec3(1.0);
	r.p = rot * vec3(0.0, 0.0, -9.5) + vec3(0.0, 0.0, 0.0);
	r.d = rot * normalize(vec3(uv, 1.5));

	return r;
}

vec3 trace(vec2 uv, vec2 uvD, inout float sceneDist)
{
	float minDist = 9999999.0;
	float count = 0.0;
	float diffuseSum = 0.0, maxDiffuseSum = 0.0;

    mat3 mp = rotationXY(vec2(0.0, 0.25*3.14159)) * rotationXY(vec2(3.14159*0.25, 0.0));

	vec3 accum = vec3(0.0);
	sceneDist = 9999999.0;

	ray r = setupRay(uv, 1.0);
	vec3 op = r.p + 1.0*r.d;
	r.p = op;

	for (int i=0; i<RAY_STEPS; i++) {
		float dist = scene(r.p, mp);
		minDist = min(minDist, dist);
		r.p += dist * r.d;
		if (dist < THRESHOLD) {
			r.p -= dist * r.d;
			vec3 nml = normal(r, dist, mp);
			float diffuse = shade(r, nml, dist);
			r.d = reflect(r.d, nml);
			r.d = offset(r.d, nml, 1.0, 1.0, diffuse);
			vec3 bg = shadeBg(-r.d);
			accum = r.transmit * bg;
			break;
		} else if (dist > MAX_DISTANCE) {
			vec3 bg = shadeBg(-r.d);
			accum = r.transmit * bg;
			break;
		}
	}
	float glow = 0.0;
    if (minDist > THRESHOLD) {
        minDist += -4.0*pow(abs(r.d.y), 2.8);
		glow = 0.04*pow(pow(max(0.0, (1.0-minDist)), 2.0), 5.0);
    }
	return accum + glow;
}

void main(void)
{
	vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
	uv = (2.0 * uv - 1.0) * aspect;

	vec2 uvD = 2.0*aspect / iResolution.xy;

	ray r;
	r = setupRay(uv, 0.0);

	float dist = 999999.0;
	vec3 light = trace(uv, uvD, dist);
	r.light = r.transmit * light;

	gl_FragColor = vec4( 1.0 - exp(-1.5 * r.light), 1.0 );
}