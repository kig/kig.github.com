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

uniform vec4 iBoundingSphere;

uniform vec3 iLightPos;
uniform vec3 iSunColor;
uniform vec3 iSkyColor;
uniform vec3 iGroundColor;
uniform vec3 iHorizonColor;

uniform float iShutterSpeed;
uniform float iISO;
uniform float iExposureCompensation;

#define THRESHOLD 0.01
#define MAX_DISTANCE 16.0

#define RAY_STEPS 200
#define MAX_SAMPLES (max(4.0, 8.0*maxDiffuseSum))

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

vec3 scene(vec3 p)
{
	float dist = 1e9;
	float materialIndex = 0.0;
	float hitIndex = 0.0;
	float nd = 0.0;
	for (int i=0; i<16; i++) {
		vec4 posT = texture2D(iChannel1, vec2(float(i*5+4)/128.0, 0.0));
		float tm = posT.w;
		posT.w = 0.0;
		float t = floor(tm / 256.0);
		if (t == 0.0) break;

		float m = floor(tm - t*256.0);
		vec4 params = texture2D(iChannel1, vec2(float(i*5)/128.0, 0.0));
		mat4 mx;
		mx[0] = texture2D(iChannel1, vec2(float(i*5+1)/128.0, 0.0));
		mx[1] = texture2D(iChannel1, vec2(float(i*5+2)/128.0, 0.0));
		mx[2] = texture2D(iChannel1, vec2(float(i*5+3)/128.0, 0.0));
		mx[3] = posT;

		if (t == 1.0) {
			nd = length(vec3(posT+vec4(p,0.0)))-params.x;
		} else if (t == 2.0) {
			nd = length(max(vec3(abs(posT+vec4(p,0.0)))-params.xyz, 0.0))-params.w;
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

vec3 normal(ray r, float d)
{
	float e = 0.001;
	float dx = scene(vec3(e, 0.0, 0.0) + r.p).x - d;
	float dy = scene(vec3(0.0, e, 0.0) + r.p).x - d;
	float dz = scene(vec3(0.0, 0.0, e) + r.p).x - d;
	return normalize(vec3(dx, dy, dz));
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

float shade(inout ray r, vec3 nml, float d, float materialIndex)
{
	mat m = material(r.p, materialIndex);
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
	vec2 uvD = ((2.0 * ((gl_FragCoord.xy+vec2(1.0, 1.0)) / iResolution.xy) - 1.0) * pixelAspect) - uv;
	
	vec3 accum = vec3(0.0);

	ray r = setupRay(time, uv, 1.0);
	vec3 rc = r.p-iBoundingSphere.xyz;
	float c = dot(rc, rc) - (iBoundingSphere.w*iBoundingSphere.w);
	float b = dot(r.d, rc);
	float d = b*b - c;
	if (d < 0.0) {
		return shadeBg(time, -r.d);
	}
	float k = 1.0;
	
	for (int i=0; i<RAY_STEPS; i++) {
		if (k > MAX_SAMPLES) break;
		vec3 distHitMat = scene(r.p);
		float dist = distHitMat.x;
		minDist = min(minDist, dist);
		r.p += dist * r.d;
		if (dist < THRESHOLD) {
			r.p -= dist * r.d;
			vec3 nml = normal(r, dist);
			float diffuse = shade(r, nml, dist, distHitMat.z);
			diffuseSum += diffuse;
			offset(r.d, k, k+10.0*dot(nml, r.d), diffuse*0.5);
			r.d = reflect(r.d, nml);
			r.p += 4.0*THRESHOLD * r.d;
			count++;
			
			if (dot(r.transmit, vec3(8.0)) < 1.0) {
				// if even the brightest light in the scene can't
				// make the ray brighter, let's bail.
				accum += r.light;
				k++;
				r = setupRay(time, uv+(uvD*mod(xy(k, 4.0), 4.0)/4.0), k);
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
			r = setupRay(time, uv+(uvD*mod(xy(k, 4.0), 4.0)/4.0), k);
			maxDiffuseSum = max(diffuseSum, maxDiffuseSum);
			diffuseSum = 0.0;
		}
	}

	accum += r.light;
	return accum / k;
}

void main(void)
{
	vec3 light = trace(iGlobalTime);
	
	light = 1.0 - exp(-light * iISO * iShutterSpeed * pow(2.0, iExposureCompensation));
	gl_FragColor = vec4( light, 1.0 );
}
