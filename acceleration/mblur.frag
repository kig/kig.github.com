precision highp float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float iPick;

uniform vec4 iCamera;
uniform vec4 iCameraTarget;
uniform vec4 iCameraV;
uniform vec4 iCameraTargetV;

uniform vec4 iObject[16];
uniform vec4 iObjectV[16];

uniform vec3 iLightPos;

uniform bool iUseFourView;

uniform float iShutterSpeed;
uniform float iISO;
uniform float iExposureCompensation;

#define SHADOWS
#define SAILS
#define MBLUR_SAMPLES 4.0

#define FOG_D 80.0

struct tSphere {
	vec3 center;
	float radius;
	vec3 color;
	float spec;
};

// rotate position around axis
vec2 rotate(vec2 p, float a)
{
	return vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));
}

// return ray p,d distance to triangle v0,v1,v2
// returns -1.0 if no intersection
// writes UV value to the uv vector
float rayIntersectsTriangle(vec3 p, vec3 d, vec3 v0, vec3 v1, vec3 v2, inout vec2 uv)
{
	vec3 e1,e2,h,s,q;
	float a,f,u,v,t;
	e1 = v1-v0;
	e2 = v2-v0;

	h = cross(d,e2);
	a = dot(e1,h);

	f = 1.0 / a;
	s = p-v0;
	u = f * dot(s,h);

	q = cross(s,e1);
	v = f * dot(d,q);
	
	uv = vec2(u,v);
	
	if (u < 0.0 || u > 1.0 || v < 0.0 || u+v > 1.0) {
		return -1.0;
	}

	// at this stage we can compute t to find out where
	// the intersection point is on the line
	t = f * dot(e2,q);

	float m = float(t <= 0.00001 || (a > -0.00001 && a < 0.00001));
	
	t = mix(t, -1.0, m);
	
	return t;

}


float raySphereDet(vec3 ray, vec3 dir, vec3 center, float radius, float closestHit, inout float b)
{
	vec3 rc = ray-center;  // 1
	float c = dot(rc, rc); // 1
	c -= radius*radius;    // 2?
	b = dot(dir, rc);      // 1
	return b*b - c;        // 2?
}

bool rayBV(vec3 ray, vec3 dir, vec3 center, float radius, float closestHit)
{
	float b;
	float d = raySphereDet(ray, dir, center, radius, closestHit, b);
	float t = -b - sqrt(abs(d));
	return (d < 0.0 || t < -(2.0*radius) || t > closestHit+(2.0*radius));
}

float rayIntersectsSphere(vec3 ray, vec3 dir, vec3 center, float radius, float closestHit)
{
	float b;
	float d = raySphereDet(ray, dir, center, radius, closestHit, b); // 7
	float t = -b - sqrt(abs(d));
	float st = step(0.0, min(t,d));
	return mix(closestHit, t, st);
}

float rayIntersectsPlane(vec3 ro, vec3 rd, vec3 p, vec3 pnml, inout vec3 nml, float closestHit)
{
	float pd = dot(pnml, rd);
	float dist = dot(pnml, p-ro) / pd;
	if (abs(pd) > 0.00001 && dist > 0.0 && dist < closestHit) {
		nml = pnml;
		if (pd < 0.0) nml = -nml;
		return dist;
	}
	return closestHit;
}

float rayIntersectsDisk(vec3 ro, vec3 rd, vec3 p, vec3 pnml, float r1, float r2, float a, inout vec3 nml, float closestHit)
{
	vec3 tmp;
	float dist = rayIntersectsPlane(ro, rd, p, pnml, tmp, closestHit);
	vec3 ip = ro + dist*rd - p;
	float len = length(ip);
	float angle = dot(normalize(ip), normalize(cross(pnml, vec3(rotate(vec2(1.0,0.0),a), 1.0))));
	if (dist < closestHit && len >= r1 && len <= r2 && angle > -0.5) {
		nml = tmp;
		return dist;
	}
	if (sign(dot(pnml, p-ro)) != sign(dot(pnml, p-(ro+0.1)))) {
		dist = rayIntersectsSphere(ro, rd, p, max(r1, r2), closestHit);
		float planeD = abs(dot(p-(ro+rd*dist), pnml));
		if (dist < closestHit && planeD < 0.05) {
			nml = normalize(p - (ro+rd*dist));
			return dist;
		}
	}
	return closestHit;
}

float intersect(float time, vec3 ray, vec3 dir, inout vec3 nml, inout tSphere sphere, inout float pick)
{
	float dist = 1e4;

	sphere.radius = -2.0;
	sphere.center = ray+dist*dir;
	nml = -dir;

	pick = -1.0;
	float dt = (time-iGlobalTime);

	for (int i=0; i<16; i++) {
		float fi = float(i);
		#ifdef OES_TEXTURE_FLOAT
		vec4 pr = texture2D(iChannel1, vec2(fi/16.0 + 0.5/16.0, 0.25));
		pr += dt * texture2D(iChannel1, vec2(fi/16.0 + 0.5/16.0, 0.75));
		#else
		vec4 pr = iObject[i];
		pr += dt * iObjectV[i];
		#endif
		if (pr.w == 0.0) {
			continue;
		}
		if (pr.w < 0.0) {
			break;
		}
		vec3 cen = pr.xyz;
		float r = pr.w;
		float t;

#ifdef SAILS
		float a = 8.0*time*(1.0+mod(fi, 2.5));
		t = rayIntersectsDisk(ray, dir, cen, vec3(0.0, 0.0, 1.0), r*1.25, r*2.5, a, nml, dist);
		if (t < dist) {
			dist = t;
			sphere.radius = 100.0;
			sphere.center = cen;
			sphere.spec = 16.0;
			sphere.color = vec3(0.5, 0.1, 0.05);
			pick = fi;
		}
#endif

		t = rayIntersectsSphere(ray, dir, cen, r, dist);
		if (t < dist) {
			dist = t;
			sphere.radius = r;
			sphere.center = cen;
			nml = normalize(sphere.center - ray - dist*dir);
			float odd = mod(fi, 2.0);
			float ay = abs(nml.y);
			float fy = float(ay < 0.05 || (ay > 0.75 && ay < 0.78));
			sphere.color = mix(vec3(0.1), mix(vec3(0.95, 0.8, 0.7), vec3(0.2), fy), odd);
			sphere.spec = mix(64.0, 16.0, odd);
			pick = fi;
		}
	}
	
	return dist;
}


vec3 shadeBg(vec3 dir)
{
	vec3 lightPos_ = iLightPos;
	vec3 bgLight = normalize(lightPos_);
	vec3 lightPos = bgLight * 9999.0;
	vec3 sun = vec3(5.0, 3.5, 2.0)*4.0;

	vec3 bgCol = vec3(0.2, 0.15, 0.1);
	float bgDiff = dot(dir, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(dir, bgLight);
	bgCol += bgDiff*vec3(0.25, 0.5, 0.5);
	bgCol += sun*(0.1*pow( max(sunPow, 0.0), 2.0) + pow( max(sunPow, 0.0), abs(bgLight.y)*256.0));
	bgCol += bgCol*(2.0*pow( max(-sunPow, 0.0), 2.0)+ pow( max(sunPow, 0.0), abs(bgLight.y)*128.0));
	return max(vec3(0.0), bgCol);
}

vec3 getEye(float time)
{
	float dt = (time-iGlobalTime);
	return (iCamera.xyz+dt*iCameraV.xyz);
}

vec3 getDir(float time, vec2 uv)
{
	float dt = (time-iGlobalTime);
	
	vec3 up = vec3(sin(iCamera.w+dt*iCameraV.w), cos(iCamera.w+dt*iCameraV.w), 0.0);
	vec3 zaxis = normalize((iCameraTarget.xyz+dt*iCameraTargetV.xyz) - (iCamera.xyz+dt*iCameraV.xyz));
	vec3 xaxis = normalize(cross(up, zaxis));
	vec3 yaxis = cross(zaxis, xaxis);
	mat3 m;
	m[0] = xaxis;
	m[1] = yaxis;
	m[2] = zaxis;
	return m*normalize(vec3(uv*(iCameraTarget.w+dt*iCameraTargetV.w), 1.0));
}

vec3 doReflections(float time, vec3 ray, vec3 dir, inout float doAA, float picked)
{
	vec3 light = vec3(0.0);
	vec3 transmit = vec3(1.0);
	bool earlyTermination = true;
	doAA = 0.0;
	for (int i=0; i<3; i++) {
		vec3 nml;
		tSphere sphere;
		float target = -1.0;
		float dist = intersect(time, ray, dir, nml, sphere, target);
		float fog = pow(0.99, max(0.0, dist));
		vec3 bg = transmit * shadeBg(dir);
		light += (1.0-fog) * bg;
		transmit *= fog;
		sphere.spec *= min(1.0, mix(-1.0, 1.0, abs(picked-target)));
		if (sphere.radius > 0.0) {
			doAA = 1.0;
			if (sphere.spec < 0.0) {
				float a = 1.0 - abs(dot(dir, nml));
				light += transmit * a * vec3(2.5, 1.6, 1.3);
			}
			transmit *= sphere.color;
			ray += dist*dir;
			//vec3 v = sign(tex.xyz-0.5)*pow(tex.xyz, vec3(2.0));
			nml = normalize(nml);// + v/(1.0+sphere.spec));
			//tex = tex.yzwx;
			dir = reflect(dir, nml);
			ray += dir*0.01;
		} else {
			earlyTermination = false;
			break;
		}
	}
	if (earlyTermination) {
		light += transmit * shadeBg(dir);
	}
	return light;
}

vec3 doPrimary(float time, vec3 ray, vec3 dir, float picked)
{
	vec3 light = vec3(0.2666666);
	vec3 nml;
	tSphere sphere, sphere2;
	float target = -1.0;
	float dist = intersect(time, ray, dir, nml, sphere, target);
	if (sphere.radius > 0.0) {
		light = (picked == target) ? vec3(0.75) : vec3(0.35 + 0.25*exp(-(dist - 90.0)*0.1));
	}
	return light;
}

vec4 perspectiveView(vec2 fragCoord, vec2 pixelRatio, vec2 pixelAspect, float picked) {
	vec4 tex = texture2D(iChannel0, gl_FragCoord.xy/256.0);
	float k = 0.0;
	vec3 col = vec3(0.0);

	float box_size = ceil(sqrt(MBLUR_SAMPLES));
	for (float dt = 0.0; dt < MBLUR_SAMPLES; dt++) {
		float ty = floor(dt/box_size);
		float tx = dt - ty*box_size;
		float time = (iGlobalTime - (tex.r*2.0-dt/MBLUR_SAMPLES)*iShutterSpeed);
		tex = tex.yzwx;

		vec3 ray = getEye(time);
		vec3 dir = getDir(time, ((fragCoord+vec2(tx,ty)/box_size)*pixelRatio - 1.0)*pixelAspect);

		float rayAA;
		col += doReflections(time, ray, dir, rayAA, picked);
		k++;
	}
	col = 1.0 - exp(-col/k * iISO * iShutterSpeed * pow(2.0, iExposureCompensation));
	return vec4( col, 1.0 );
}

vec4 modelingView(vec3 ray, vec3 dir, float picked) {
	vec3 col = doPrimary(iGlobalTime, ray, dir, picked);
	return vec4( col, 1.0 );
}

vec4 topView(vec2 fragCoord, vec2 pixelRatio, vec2 pixelAspect, float picked) {
	vec2 uv = (fragCoord*pixelRatio - 1.0)*pixelAspect;

	vec3 ray = vec3(uv.x*10.0, 100.0, uv.y*10.0);
	vec3 dir = vec3(0.0, -1.0, 0.0);
	return modelingView(ray, dir, picked);
}

vec4 frontView(vec2 fragCoord, vec2 pixelRatio, vec2 pixelAspect, float picked) {
	vec2 uv = (fragCoord*pixelRatio - 1.0)*pixelAspect;
	vec3 ray = vec3(uv.x*10.0, uv.y*10.0, -100.0);
	vec3 dir = vec3(0.0, 0.0, 1.0);
	return modelingView(ray, dir, picked);
}

vec4 rightView(vec2 fragCoord, vec2 pixelRatio, vec2 pixelAspect, float picked) {
	vec2 uv = (fragCoord*pixelRatio - 1.0)*pixelAspect;
	vec3 ray = vec3(100.0, uv.y*10.0, uv.x*10.0);
	vec3 dir = vec3(-1.0, 0.0, 0.0);
	return modelingView(ray, dir, picked);
}


void main(void)
{
	float xOff = 0.0;

	vec2 fragCoord = gl_FragCoord.xy;
	
	vec2 pixelAspect = vec2(iResolution.x / iResolution.y, 1.0);
	vec2 pixelRatio = vec2(2.0) / iResolution.xy;
	vec2 uv = (fragCoord*pixelRatio - 1.0)*pixelAspect;
	
	float picked = iPick;

	vec2 uvBR = ((fragCoord+vec2(1.0))*pixelRatio - 1.0)*pixelAspect;
	// if (iUseFourView && length(sign(uv) - sign(uvBR)) > 0.0) { // border pixel
	// 	gl_FragColor = vec4(0.75, 0.75, 0.75, 1.0);
	// 	return;
	// }

	//if (!iUseFourView || (uv.x < 0.0 && uv.y > 0.0)) {
	//	if (iUseFourView) {
	//		fragCoord *= 2.0;
	//		fragCoord.y -= iResolution.y;
	//	}
		gl_FragColor = perspectiveView(fragCoord, pixelRatio, pixelAspect, picked);
	// } else if (uv.x > 0.0 && uv.y > 0.0) { // top view
	// 	fragCoord *= 2.0;
	// 	fragCoord -= iResolution.xy;
	// 	gl_FragColor = topView(fragCoord, pixelRatio, pixelAspect, picked);
	// } else if (uv.x < 0.0 && uv.y < 0.0) { // front view
	// 	fragCoord *= 2.0;
	// 	gl_FragColor = frontView(fragCoord, pixelRatio, pixelAspect, picked);
	// } else { // right view
	// 	fragCoord *= 2.0;
	// 	fragCoord.x -= iResolution.x;
	// 	gl_FragColor = rightView(fragCoord, pixelRatio, pixelAspect, picked);
	// }
}