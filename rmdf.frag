precision highp float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float iPick;

uniform vec3 iCamera;
uniform vec3 iCameraTarget;

uniform vec3 iLightPos;
uniform vec3 iSunColor;
uniform vec3 iSkyColor;
uniform vec3 iGroundColor;
uniform vec3 iHorizonColor;

uniform float iObjectCount;

uniform float iShutterSpeed;
uniform float iISO;
uniform float iExposureCompensation;

uniform float iMinSampleCount;
uniform float iMaxSampleCount;
uniform int iMaxRaySteps;

varying float vAnyObjectsVisible;
varying float vObjectVisible[3];

#define THRESHOLD 0.01
#define MAX_DISTANCE 16.0

#define RAY_STEPS 10000
#define MAX_SAMPLES (max(iMinSampleCount, iMaxSampleCount*sqrt(maxDiffuseSum)))

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

float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	
	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = texture2D( iChannel0, (uv + 0.5)/256.0, -100.0 ).yx;
	return mix( rg.x, rg.y, f.z );
}

float map( in vec3 p )
{
	vec3 q = p + 0.2*vec3(-1.0, 1.0, 2.2)*iGlobalTime;
	float f;
    f = 0.500*noise( q ); q = q*2.0;
    f += 0.25*noise( q ); q = q*2.0;
    f += 0.125*noise( q ); q = q*2.0;
    f += 0.0625*noise( q ); q = q*2.0;
    f += 0.03125*noise( q ); q = q*2.0;
    f += 0.015625*noise( q );
	return mix( pow(f*0.89, 6.0)*-2.0+0.2 , pow(f, 0.7)*0.1+0.2, mod(-1.75, -3.14159*15.0) );
}

float dfSphere(vec3 p, float radius) {
	//return max(length(p)-radius, (map(p/radius)));
	return length(p)-radius;
}

float dfBox(vec3 p, vec3 dimensions, float cornerRadius) {
	return length(max(abs(p)-dimensions, 0.0))-cornerRadius;
}

float lengthN(vec2 p, float n) {
	float d = pow(p.x, n) + pow(p.y, n);
	return pow(d, 1.0/n);
}

float dfTorus(vec3 p, float innerRadius, float outerRadius, float cornerRadius, float boxiness) {
	vec2 q = vec2(lengthN(p.xz, 2.0+18.0*boxiness)-innerRadius, p.y);
	return lengthN(q, 2.0+8.0*(0.5-cornerRadius))-outerRadius;
}

float dfTriPrism(vec3 p, float radius, float height)
{
    vec3 q = abs(p);
    return max(q.z-height,max(q.x*0.866025+p.y*0.5,-p.y)-radius*0.5);
}

float dfCylinder(vec3 p, float radius, float height) {
	vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(radius, height);
	return min(max(d.x,d.y),0.0) + length(max(d,0.0));	
}

float dfRing(vec3 p, float radius, float innerRadius, float height, float cornerRadius)
{
	float c1 = dfCylinder(p, radius-cornerRadius, height-cornerRadius) - cornerRadius;
	float c2 = dfCylinder(p, innerRadius, height*2.0);
	return max(c1, -c2);
}

vec3 scene(vec3 p, bool bounce, inout float testCount)
{
	float dist = 1e9;
	float materialIndex = -1.0;
	float hitIndex = -1.0;
	float nd = 0.0;
	vec4 p4 = vec4(p, 1.0);
	for (int i=0; i<24; i++) {
		if (float(i) >= iObjectCount) break;
		if (!bounce) {
			float vis = vObjectVisible[i/8];
			int idx = i/8;
			int bit = i-8*idx;
			if (mod(floor(vis / pow(2.0, float(bit))), 2.0) == 0.0) {
				continue;
			}
		}
		testCount++;

		vec4 params = texture2D(iChannel1, vec2(float(i*5)/128.0, 0.0));
		mat4 mx;
		mx[0] = texture2D(iChannel1, vec2(float(i*5+1)/128.0, 0.0));
		mx[1] = texture2D(iChannel1, vec2(float(i*5+2)/128.0, 0.0));
		mx[2] = texture2D(iChannel1, vec2(float(i*5+3)/128.0, 0.0));
		vec4 posT = texture2D(iChannel1, vec2(float(i*5+4)/128.0, 0.0));
		float tm = posT.w;
		float t = floor(tm / 256.0);
		float m = floor(tm - t*256.0);
		mx[3] = vec4(posT.xyz, 1.0);

		vec3 tp = (mx * p4).xyz;

		if (t == DF_SPHERE) {
			nd = dfSphere(tp, params.x);
		} else if (t == DF_BOX) {
			nd = dfBox(tp, params.xyz, params.w);
		} else if (t == DF_TORUS) {
			nd = dfTorus(tp, params.x, params.y, params.z, params.w);
		} else if (t == DF_PRISM) {
			nd = dfTriPrism(tp, params.x, params.y);
		} else if (t == DF_RING) {
			nd = dfRing(tp, params.x, params.y, params.z, params.w);
		}
		if (nd < dist) {
			dist = nd;
			hitIndex = float(i);
			materialIndex = m;
		}
	}
	return vec3(dist, hitIndex, materialIndex);
}

mat material(vec3 p, float materialIndex)
{
	mat m;
	vec4 md0 = texture2D(iChannel1, vec2((materialIndex*2.0)/128.0, 0.5));
	vec4 md1 = texture2D(iChannel1, vec2((materialIndex*2.0+1.0)/128.0, 0.5));
	m.transmit = md0.xyz;
	m.diffuse = md1.w;
	m.emit = md1.xyz;
	return m;
}

vec3 normal(ray r, float d, bool bounce, float i)
{
	vec4 params = texture2D(iChannel1, vec2(float(i*5.0)/128.0, 0.0));
	mat4 mx;
	mx[0] = texture2D(iChannel1, vec2(float(i*5.0+1.0)/128.0, 0.0));
	mx[1] = texture2D(iChannel1, vec2(float(i*5.0+2.0)/128.0, 0.0));
	mx[2] = texture2D(iChannel1, vec2(float(i*5.0+3.0)/128.0, 0.0));
	vec4 posT = texture2D(iChannel1, vec2(float(i*5.0+4.0)/128.0, 0.0));
	float tm = posT.w;
	float t = floor(tm / 256.0);
	mx[3] = vec4(posT.xyz, 1.0);

	vec4 p = vec4(r.p, 1.0);
	p = (mx * p);

	float e = 0.001;
	if (t == DF_SPHERE) {
		float len = length(p.xyz) - params.x;
		if (abs(len) >= THRESHOLD*2.0) {
			e = 0.02;
		}
		float dx = dfSphere((mx[0]*e + p).xyz, params.x) - d;
		float dy = dfSphere((mx[1]*e + p).xyz, params.x) - d;
		float dz = dfSphere((mx[2]*e + p).xyz, params.x) - d;
		return normalize(vec3(dx, dy, dz));
	} else if (t == DF_BOX) {
		float dx = dfBox((mx[0]*e + p).xyz, params.xyz, params.w) - d;
		float dy = dfBox((mx[1]*e + p).xyz, params.xyz, params.w) - d;
		float dz = dfBox((mx[2]*e + p).xyz, params.xyz, params.w) - d;
		return normalize(vec3(dx, dy, dz));
	} else if (t == DF_TORUS) {
		float dx = dfTorus((mx[0]*e + p).xyz, params.x, params.y, params.z, params.w) - d;
		float dy = dfTorus((mx[1]*e + p).xyz, params.x, params.y, params.z, params.w) - d;
		float dz = dfTorus((mx[2]*e + p).xyz, params.x, params.y, params.z, params.w) - d;
		return normalize(vec3(dx, dy, dz));
	} else if (t == DF_PRISM) {
		float dx = dfTriPrism((mx[0]*e + p).xyz, params.x, params.y) - d;
		float dy = dfTriPrism((mx[1]*e + p).xyz, params.x, params.y) - d;
		float dz = dfTriPrism((mx[2]*e + p).xyz, params.x, params.y) - d;
		return normalize(vec3(dx, dy, dz));
	} else if (t == DF_RING) {
		float dx = dfRing((mx[0]*e + p).xyz, params.x, params.y, params.z, params.w) - d;
		float dy = dfRing((mx[1]*e + p).xyz, params.x, params.y, params.z, params.w) - d;
		float dz = dfRing((mx[2]*e + p).xyz, params.x, params.y, params.z, params.w) - d;
		return normalize(vec3(dx, dy, dz));
	}

}

vec3 shadeBg(float time, vec3 nml)
{
	vec3 bgLight = normalize(iLightPos);
	vec3 lightPos = bgLight * 9999.0;
	vec3 sun = iSunColor*10.0; //*(0.5+sin(time/3.0)*0.5);

	vec3 bgCol = sun*0.2*iGroundColor;
	float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	bgCol += 0.1*sun*pow( max(sunPow, 0.0), 2.0);
	bgCol += 2.0*bgCol*pow( max(-sunPow, 0.0), 2.0);
	bgCol += sun*0.2*bgDiff*iSkyColor;
	bgCol += sun*pow( max(sunPow, 0.0), abs(bgLight.y)*256.0);
	bgCol += bgCol*pow( max(sunPow, 0.0), abs(bgLight.y)*128.0);
	return max(vec3(0.0), bgCol);
}

float shade(inout ray r, vec3 nml, float d, float materialIndex, float fresnel)
{
	mat m = material(r.p, materialIndex);
	r.light += m.emit * r.transmit;
	r.transmit *= mix(vec3(1.0,1.0,1.0), m.transmit, fresnel);
	return m.diffuse;
}

vec2 xy(float k, float n)
{
	return vec2(floor(k/n), k-(floor(k/n)*n));
}

void offset(inout vec3 dir, vec3 nml, float k, float count, float diffuse) {
	vec2 phiTheta = hash2(count) * 6.2831;
	float u = cos(phiTheta.x);
	float sq = sqrt(1.0 - u * u);
	float rx = sq * cos(phiTheta.y); 
	float ry = sq * sin(phiTheta.y);
	float rz = u;
	vec3 v = vec3(rx, ry, rz);
	dir = normalize(mix(dir, nml + v, diffuse));
}

vec3 getDir(float time, vec2 uv, float k)
{
	float dt = (time-iGlobalTime);
	
	vec3 up = vec3(0.0, 1.0, 0.0);
	vec3 zaxis = normalize(iCameraTarget.xyz - iCamera.xyz);
	vec3 xaxis = normalize(cross(up, zaxis));
	vec3 yaxis = cross(zaxis, xaxis);
	mat3 m;
	m[0] = xaxis;
	m[1] = yaxis;
	m[2] = zaxis;
	return m*normalize(vec3(uv, 1.0));
}

ray setupRay(float time, vec2 uv, float k) {
	ray r;
	r.light = vec3(0.0);
	r.transmit = vec3(1.0);
	r.p = iCamera.xyz;
	r.d = getDir(time, uv, k);

	return r;
}

vec3 trace(float time)
{	
	float minDist = 9999999.0;
	float count = 0.0;
	float diffuseSum = 0.0, maxDiffuseSum = 0.0;
	
	vec2 pixelAspect = vec2(iResolution.x / iResolution.y, 1.0);
	vec2 pixelRatio = vec2(2.0) / iResolution.xy;
	vec2 uv = (gl_FragCoord.xy*pixelRatio - 1.0)*pixelAspect;

	vec3 accum = vec3(0.0);

	ray r = setupRay(time, uv, 1.0);
	if (vAnyObjectsVisible == 0.0) {
		// return vec3(0.0); 
		return shadeBg(time, -r.d);
	}
	float k = 1.0;
	float fi = 0.0;
	bool bounce = false;

	vec2 uvD = ((2.0 * ((gl_FragCoord.xy+vec2(1.0, 1.0)) / iResolution.xy) - 1.0) * pixelAspect) - uv;
		
	for (int i=0; i<RAY_STEPS; i++) {
		if (k > MAX_SAMPLES || i >= iMaxRaySteps) break;
		vec3 distHitMat = scene(r.p, bounce, fi);
		float dist = distHitMat.x;
		minDist = min(minDist, dist);
		r.p += dist * r.d;
		if (dist < THRESHOLD) {
			r.p -= dist * r.d;
			vec3 nml = normal(r, dist, bounce, distHitMat.y);
			float f = pow(1.0 - clamp(dot(nml, r.d), 0.0, 1.0), 5.0);
			float diffuse = shade(r, nml, dist, distHitMat.z, f);
			diffuseSum += diffuse;

			r.p -= 4.0*THRESHOLD*diffuse*f * r.d;

			r.d = reflect(r.d, nml);
			offset(r.d, nml, k, k+10.0*dot(nml, r.d), diffuse*f);
			r.p += 4.0*THRESHOLD * r.d;

			count++;
			bounce = true;
			
			if (dot(r.transmit, vec3(8.0)) < 1.0 || count > 2.0+(1.0-diffuse*f)*4.0) {
				// if even the brightest light in the scene can't
				// make the ray brighter, let's bail.
				accum += r.light;
				k++;
				count = 0.0;
				r = setupRay(time, uv+(uvD*mod(xy(k, 4.0), 4.0)/4.0), k);
				bounce = false;
				maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
				diffuseSum = 0.0;
			}
		} else if (dist > MAX_DISTANCE) {
			vec3 bg = shadeBg(time, -r.d);
			if (minDist > THRESHOLD*1.5) {
				r.light = bg;
				break;
			}
			accum += r.light + r.transmit * bg;
			k++;
			count = 0.0;
			r = setupRay(time, uv+(uvD*mod(xy(k, 4.0), 4.0)/4.0), k);
			bounce = false;
			maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
			diffuseSum = 0.0;
		}
	}

//	return vec3(fi / 1000.0);

	accum += r.light;
	return accum / k;
}

void main(void)
{
	vec3 light = trace(iGlobalTime);
	
	light = 1.0 - exp(-light * iISO * iShutterSpeed * pow(2.0, iExposureCompensation));
	// if (vAnyObjectsVisible == 0.0) light -= 0.2;
	// else light += 0.1*vAnyObjectsVisible;
	gl_FragColor = vec4( light, 1.0 );
}
