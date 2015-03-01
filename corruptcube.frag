precision highp float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform sampler2D iChannel0;

#define THRESHOLD 0.01
#define MAX_DISTANCE 8.0

#define RAY_STEPS 120
#define MAX_SAMPLES 4.0

#define aa_size 2.0

float     iWallTime = iGlobalTime;

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
    f += 0.3*noise( q ); q = q*3.02;
    f += 0.1*noise( q );

	d += 3.5 * f;

	d = clamp( d, 0.0, 1.0 );

	return d;
}

mat3 transpose(in mat3 inMatrix)
{
	vec3 i0 = inMatrix[0];
	vec3 i1 = inMatrix[1];
	vec3 i2 = inMatrix[2];

	mat3 outMatrix = mat3(
                 vec3(i0.x, i1.x, i2.x),
                 vec3(i0.y, i1.y, i2.y),
                 vec3(i0.z, i1.z, i2.z)
                 );
	return outMatrix;
}

mat3 mp = rotationXY(vec2(0.0, 0.25*3.14159)) * rotationXY(vec2(3.14159*0.25, 0.0));

float scene(vec3 p)
{
	float cube = length(max(abs(mp*p - vec3(0.0, 0.0, 0.0)) - vec3(1.95), 0.0)) - 0.05;
	return cube;
}

mat material(vec3 p)
{
	float cube = length(max(abs(p - vec3(0.0, 2.0, 0.0)) - vec3(1.95), 0.0)) - 0.05;
	mat m;
	m.emit = vec3(0.0);
	m.transmit = vec3(1.0);
    float n = map(p.yzz*1.5*tan(0.25*3.14159*iWallTime)-tan(p.z*0.1+0.25*3.14159*iWallTime));
	m.transmit = vec3(1.1)*n; // 0.95, 0.7, 0.5);
	m.diffuse = 0.1+(1.0-sqrt(abs(n)));
	return m;
}

vec3 normal(ray r, float d)
{
	float e = 0.001;
	float dx = scene(vec3(e, 0.0, 0.0) + r.p) - d;
	float dy = scene(vec3(0.0, e, 0.0) + r.p) - d;
	float dz = scene(vec3(0.0, 0.0, e) + r.p) - d;
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

	vec3 accum = vec3(0.0);
	sceneDist = 9999999.0;

	ray r = setupRay(uv, 1.0);
	vec3 op = r.p + 1.0*r.d;
	r.p = op;
	float k = 1.0;

	for (int i=0; i<RAY_STEPS; i++) {
		if (k > MAX_SAMPLES) break;
		float dist = scene(r.p);
		minDist = min(minDist, dist);
		r.p += dist * r.d;
		if (dist < THRESHOLD) {
			if (sceneDist == 9999999.0) {
				sceneDist = length(r.p - op);
			}
			r.p -= dist * r.d;
			vec3 nml = normal(r, dist);
			float diffuse = shade(r, nml, dist);
			diffuseSum += diffuse;
			offset(r.d, k, k+10.0*dot(nml, r.d), diffuse*0.5);
			r.d = reflect(r.d, nml);
			r.p += 4.0*THRESHOLD * r.d;
			count++;

			if (dot(r.transmit, vec3(8.0)) < 0.2) {
				// if even the brightest light in the scene can't
				// make the ray brighter, let's bail.
				accum += r.light;
				k++;
				r = setupRay(uv+(uvD*mod(xy(k, aa_size), aa_size)/aa_size), k);
				maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
				diffuseSum = 0.0;
			}
		} else if (dist > MAX_DISTANCE) {
			vec3 bg = shadeBg(-r.d);
			if (minDist > THRESHOLD*10.5) {
				accum = bg;
				break;
			}
			accum += r.light + r.transmit * bg;
			k++;
			r = setupRay(uv+(uvD*mod(xy(k, aa_size), aa_size)/aa_size), k);
			if (sceneDist < 9999999.0) {
				r.p += sceneDist*0.95*r.d;
			}
			maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
			diffuseSum = 0.0;
		}
	}
	float glow = 0.0;
    if (minDist > THRESHOLD) {
        minDist += -4.0*pow(abs(r.d.y), 2.8);
		glow = 0.04*pow(pow(max(0.0, (1.0-minDist)), 2.0), 5.0);
    }
	return accum / max(1.0, k-1.0) + glow;
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