precision mediump float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iOpen;
// Weird undulating things
// Playing with shading

// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

// BIG THANKS:
// - noise, hash and vector offset functions from iq, ditto for the raymarch funcs
// - got into raymarching through gltracy's sample code

#define THRESHOLD 0.02
#define MAX_DISTANCE 10.0

#define RAY_STEPS 100
#define MAX_SAMPLES 2.0

#define AA_SIZE 2.0


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

vec2 hash2( float n )
{
    return fract(sin(vec2(n,n+1.0))*vec2(43758.5453123,22578.1459123));
}

vec3 hash3( float n )
{
    return fract(sin(vec3(n,n+1.0,n+2.0))*vec3(43758.5453123,22578.1459123,19642.3490423));
}

vec3 p3 = vec3(-2.5, -1.00, 0.2);

float scene(vec3 p)
{
	vec3 c = vec3(8.0, 0.0, 8.0);
	vec3 q = mod(p, c)-0.5*c;
	float cube = length(max(abs(q) - vec3(0.5, 1.0*(1.0-sin(iGlobalTime*4.0+p.x+p.z))+0.05, 0.5), 0.0));
	c = vec3(53.0, 0.0, 25.0);
	q = mod(p, c)-0.5*c;
	float a = iGlobalTime * 4.0 + 2.0*floor(p.z / 25.0);
	float s2 = length(q-vec3(3.0*cos(a), -2.0*(sin(a*1.2))+7.0, +3.0*sin(a))) - 3.0;
	return min(cube, s2);
}

mat material(vec3 p)
{
	vec3 c = vec3(8.0, 0.0, 8.0);
	vec3 q = mod(p, c)-0.5*c;
	float cube = length(max(abs(q) - vec3(0.5, 1.0-sin(iGlobalTime*4.0+p.x+p.z)+0.05, 0.5), 0.0));
	c = vec3(53.0, 0.0, 25.0);
	q = mod(p, c)-0.5*c;
	float a = iGlobalTime * 4.0 + 2.0*floor(p.z / 25.0);
	float s2 = length(q-vec3(3.0*cos(a), -2.0*(sin(a*1.2))+7.0, +3.0*sin(a))) - 3.0;
	mat m;
	m.emit = vec3(0.0);
	m.transmit = vec3(1.0);
	m.diffuse = 0.0;
	if (cube < s2) {
		m.transmit = vec3(0.9, 0.6, 0.3);
		m.diffuse = clamp(0.0, 1.0, abs(cos(p.y)));
		m.transmit = mix(vec3(1.0, 0.9, 0.7), vec3(0.9, 0.6, 0.95), 1.0-m.diffuse*m.diffuse);
		m.transmit *= 1.0-0.8*pow(abs(sin(p.y*32.0)), 16.0);
	} else {
		m.transmit = vec3(0.8, 0.7, 0.9);
	}

	return m;
}

vec3 normal(ray r, float d)
{
	float e = 0.01;
	float dx = scene(vec3(e, 0.0, 0.0) + r.p) - d;
	float dy = scene(vec3(0.0, e, 0.0) + r.p) - d;
	float dz = scene(vec3(0.0, 0.0, e) + r.p) - d;
	vec3 v = normalize(vec3(dx, dy, dz));
	if (dot(v, r.d) < 0.0) {
		v = -v;
	}
	return v;
}

vec3 lightPos_ = vec3(
	cos(iGlobalTime*0.3)*3.0 - 4.0, 
	sin(iGlobalTime*0.1)*3.0 - 4.0, 
	-4.0
);
vec3 bgLight = normalize(lightPos_);
vec3 lightPos = bgLight * 9999.0;
vec3 sun = vec3(5.0, 3.5, 2.0)*4.0;

vec3 shadeBg(vec3 nml)
{
	vec3 bgCol = vec3(0.15, 0.2, 0.25);
	float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	bgCol += 0.1*sun*pow( max(sunPow, 0.0), 2.0);
	bgCol += 1.0*bgCol*pow( max(-sunPow, 0.0), 2.0);
	bgCol -= bgDiff*vec3(0.25, 0.5, 0.5);
	bgCol += sun*pow( max(sunPow, 0.0), abs(bgLight.y)*256.0);
	bgCol += bgCol*pow( max(sunPow, 0.0), abs(bgLight.y)*128.0);
	return max(vec3(0.0), bgCol);
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

void offset(inout vec3 nml, float k, float count, float diffuse) {
	vec3  uu  = normalize( cross( nml, vec3(0.01,1.0,1.0) ) );
	vec3  vv  = normalize( cross( uu, nml ) );
	vec2  aa = hash2( count );
	float ra = sqrt(aa.y);
	float rx = ra*cos(6.2831*aa.x); 
	float ry = ra*sin(6.2831*aa.x);
	float rz = sqrt( sqrt(k)*(1.0-aa.y) );
	vec3  rr = vec3( rx*uu + ry*vv + rz*nml );	
	nml = normalize(mix(nml, rr, diffuse));
}

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

ray setupRay(vec2 uv, float k) {
	mat3 rot = rotationXY( vec2( sin(iGlobalTime)*0.103, cos(iGlobalTime)*0.202 ) );
	ray r;
	r.light = vec3(0.0);
	r.transmit = vec3(1.0);
	r.p = vec3(uv*-1.0, 4.0*iGlobalTime)+vec3(2.0*iGlobalTime, (sin(iGlobalTime)), 0.0);
	r.d = rot * normalize(vec3(uv, 1.0));
	// offset(r.d, k, iGlobalTime+dot(r.d, r.p), 0.1*pow(0.3*length(uv), 2.0));
	return r;
}

vec3 trace(vec2 uv, vec2 uvD)
{	
	float minDist = 9999999.0;
	float count = 0.0;
	float diffuseSum = 0.0, maxDiffuseSum = 0.0;
	
	vec3 accum = vec3(0.0);

	ray r = setupRay(uv, 1.0);
	float k = 1.0;
	vec3 eye = r.p;
	float fog = 1.0;
	vec3 fogColor = shadeBg(-r.d);
	
	for (int i=0; i<RAY_STEPS; i++) {
		if (k > MAX_SAMPLES) break;
		float dist = scene(r.p);
		minDist = min(minDist, dist);
		r.p += dist * r.d;
		if (dist < THRESHOLD) {
			r.p -= dist * r.d;
			if (count == 0.0) {
				fog = clamp(0.0, 1.0, length(r.p - eye) / 120.0);
			}
			vec3 nml = normal(r, dist);
			float diffuse = shade(r, nml, dist);
			diffuseSum += diffuse;
			r.d = reflect(r.d, nml);
			r.p += 10.0*THRESHOLD * r.d;
			count++;
			
			if (dot(r.transmit, sun) < 1.0) {
				// if even the brightest light in the scene can't
				// make the ray brighter, let's bail.
				accum += r.light;
				k++;
				r = setupRay(uv+(uvD*mod(xy(k, AA_SIZE), AA_SIZE)/AA_SIZE), k);
				maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
				diffuseSum = 0.0;
			}			
		} else if (dist > MAX_DISTANCE) {
			vec3 bg = shadeBg(-r.d);
			if (minDist > THRESHOLD*1.5) {
				r.light = bg;
				break;
			}
			accum += r.light + r.transmit * bg;
			k++;
			r = setupRay(uv+(uvD*mod(xy(k, AA_SIZE), AA_SIZE)/AA_SIZE), k);			
			maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
			diffuseSum = 0.0;
		}
	}
	
	accum = (accum + r.light) / k;
	accum = mix(accum, fogColor, fog*fog); // primary ray fog
	return accum;
}

void main(void)
{
	vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
	uv = (2.0 * uv - 1.0) * aspect;

	vec2 uvD = ((2.0 * ((gl_FragCoord.xy+vec2(1.0, 1.0)) / iResolution.xy) - 1.0) * aspect) - uv;
	
	vec3 light = trace(uv, uvD);
	
	gl_FragColor = vec4( 1.0 - exp(-3.0 * light), 1.0 );
}