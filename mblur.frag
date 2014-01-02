precision lowp float;
precision lowp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float iRot;
uniform float iRot2;
uniform float iOpen;
uniform float iPick;

uniform vec4 iCamera;
uniform vec4 iCameraTarget;
uniform vec4 iCameraV;
uniform vec4 iCameraTargetV;

#define SHADOWS
#define REFLECTION
#define SECOND_BOUNCE
//#define OCULUS
#define SAILS
#define MBLUR_SAMPLES 2

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
	if (dist != closestHit && len >= r1 && len <= r2 && angle > -0.5) {
		nml = tmp;
		return dist;
	}
	return closestHit;
}

float intersect(float time, inout vec3 ray, vec3 dir, inout vec3 nml, inout tSphere sphere, inout float doAA, inout float pick)
{
	float dist = 5000.0;

	sphere.radius = doAA = -2.0;
	sphere.center = ray+dist*dir;
	nml = -dir;

	pick = -1.0;
	float b,d;
	float aaBorder = 1.15;
	float dt = (time-iGlobalTime);

	for (int i=0; i<9; i++) {
		vec4 pr = texture2D(iChannel1, vec2(float(i)/16.0, 0.0));
		pr += dt*texture2D(iChannel1, vec2(float(i)/16.0, 0.5));
		vec3 cen = pr.xyz;
		float r = pr.w;

#ifdef SAILS
		float a = 8.0*time*(1.0+mod(float(i), 2.5));
		float t = rayIntersectsDisk(ray, dir, cen, vec3(0.0, 0.0, 1.0), r*1.25, r*2.5, a, nml, dist);
		if (t < dist) {
			doAA = max(doAA, 0.0);
			dist = t;
			sphere.radius = 100.0;
			sphere.center = cen;
			sphere.spec = 8.0;
			sphere.color = vec3(0.5, 0.1, 0.05);
			pick = float(i);
		}
#endif

		d = raySphereDet(ray, dir, cen, r*aaBorder, dist, b);
		// BV intersect, let's switch on 4x sampling and check for sphere intersect
		if (d > 0.0 && -b - sqrt(d) > -r*aaBorder) {
			doAA = max(doAA, 0.0);
			// d = b*b - dot(rc,rc) + (r*r)*(aaBorder*aaBorder)
			// eliminate aaBorder^2 by
			// d_r = b^2 - rc^2 + r^2 * aaBorder^2 - r^2 * aaBorder^2 + r^2
			//     = b^2 - rc^2 + r^2
			// rewrite -r^2 * aaBorder^2 + r^2 = -r^2 * (aaBorder^2 - 1)
			d = d - (r*r)*(aaBorder*aaBorder - 1.0);
			if (d > 0.0) {
				float t = -b - sqrt(d);
				if (t > 0.0 && t < dist) {
					dist = t;
					sphere.radius = r;
					sphere.center = cen;
					nml = normalize(sphere.center - ray - dist*dir);
					float odd = mod(float(i), 2.0);
					float ay = abs(nml.y);
					float fy = float(ay < 0.05 || (ay > 0.75 && ay < 0.78));
					sphere.color = mix(vec3(0.1), mix(vec3(0.95, 0.8, 0.7), vec3(0.2), fy), odd);
					// Switch off AA for points inside the sphere
					sphere.spec = mix(64.0, 8.0, odd);
					pick = float(i);
				}
			}
		}
	}
	
	if (sphere.radius > 0.0 && sphere.radius < 100.0) {
		doAA = mix(doAA, -0.1, float(dot(nml, dir) > 0.4));
	}

	ray += dist*dir;
	return dist;
}


vec3 lightPos_ = vec3(
	-cos(iGlobalTime*0.1)*-8.5, 
	3.5+sin(iGlobalTime*0.05)*3.0, 
	-(sin(iGlobalTime*0.1)*4.0-5.4)
);
vec3 bgLight = normalize(lightPos_);
vec3 lightPos = bgLight * 9999.0;
vec3 sun = vec3(5.0, 3.5, 2.0)*4.0;

vec3 shadeBg(vec3 dir, vec3 nml)
{
	vec3 bgCol = vec3(0.2, 0.15, 0.1);
	float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	bgCol += bgDiff*vec3(0.25, 0.5, 0.5);
	bgCol += sun*(0.1*pow( max(sunPow, 0.0), 2.0) + pow( max(sunPow, 0.0), abs(bgLight.y)*256.0));
	bgCol += bgCol*(2.0*pow( max(-sunPow, 0.0), 2.0)+ pow( max(sunPow, 0.0), abs(bgLight.y)*128.0));
	return max(vec3(0.0), bgCol);
}

vec3 shade(vec3 ray, vec3 dir, vec3 nml, float dist, tSphere sphere, inout float doAA)
{
	vec3 col = vec3(0.0, 0.0, 0.0);
	vec3 bgCol = shadeBg(dir, dir);
	if (sphere.radius > 0.0) {
		float a = 1.0 - abs(dot(dir, nml));
		if (sphere.spec < 0.0) {
			col += a * vec3(2.5, 1.6, 1.3);
		}
		
		float fog = clamp(dist / FOG_D, 0.0, 1.0);
		fog *= fog;
		col = (1.0-fog)*col + fog*bgCol;
	} else {
		col = bgCol;
	}

	return col;
}

#ifdef OCULUS
vec2 hmdWarp(vec2 texIn) {
	vec2 u_lensCenter = vec2(0.0, 0.0);
	vec2 u_scaleIn = vec2(0.45, 0.7);
	vec2 u_scale = vec2(0.7);
	vec4 u_hmdWarpParam = vec4(0.7);
	vec2 u_screenCenter = vec2(0.0);
	if (texIn.x > 0.0) {
		u_lensCenter = vec2(-0.05, 0.0);
		texIn.x = (0.85 - texIn.x);
	} else {
		u_lensCenter = vec2(0.05, 0.0);
		texIn.x = (-0.85 - texIn.x);
	}
	vec2 theta = (texIn - u_lensCenter) * u_scaleIn;
	float rSq = theta.x * theta.x + theta.y * theta.y;
	vec2 theta1 = theta * (u_hmdWarpParam.x + u_hmdWarpParam.y * rSq + 
		u_hmdWarpParam.z * rSq * rSq + u_hmdWarpParam.w * rSq * rSq * rSq);
	return u_lensCenter + u_scale * theta1;
}
#endif

vec3 getDir(float time, vec2 fragCoord)
{
	vec2 pixelAspect = vec2(iResolution.x / iResolution.y, 1.0);
	vec2 pixelRatio = vec2(2.0) / iResolution.xy;
	vec2 uv = (fragCoord*pixelRatio - 1.0)*pixelAspect;

#ifdef OCULUS	
	vec2 tc = hmdWarp(uv);
	uv = tc;
	uv.x *= iResolution.x / iResolution.y;
#endif
	float dt = (time-iGlobalTime);
	
	vec3 up = vec3(0.0, 1.0, 0.0);
	vec3 zaxis = normalize((iCameraTarget.xyz+dt*iCameraTargetV.xyz) - (iCamera.xyz+dt*iCameraV.xyz));
	vec3 xaxis = normalize(cross(up, zaxis));
	vec3 yaxis = cross(zaxis, xaxis);
	mat3 m;
	m[0] = xaxis;
	m[1] = yaxis;
	m[2] = zaxis;
	return m*normalize(vec3(uv, 1.0));
}

vec3 doReflections(float time, vec3 oray, vec3 dir, vec3 onml, tSphere oSphere, float odist, float picked)
{
	vec3 ncol = vec3(0.0);
	vec3 xvec = normalize(cross(onml, vec3(1.0, 0.0, 0.0)));
	vec3 yvec = normalize(cross(onml, vec3(0.0, 1.0, 0.0)));
	float doAA_, target, k=0.0;
	//for (int x=0; x<3; x++) 
	//{
		float ix = 0.0;
		k++;
		float xx = floor(ix / 2.0);
		float yy = ix-(xx*2.0);
		vec4 tex = texture2D(iChannel0, mod(gl_FragCoord.xy*2.0+vec2(xx,yy), 256.0)/256.0);
		vec3 nml = onml;
		vec3 ray = oray;
		vec3 diff = oSphere.color;
		float dist = odist;
		tSphere sphere = oSphere;
		vec3 v = pow(tex.rgb, vec3(2.0));
		vec3 ref = reflect(dir, normalize(nml + v*(1.0/sphere.spec)) );

		// reflection
#ifdef REFLECTION
		float fog = clamp(dist / FOG_D, 0.0, 1.0);
		fog *= fog;
		ray += +ref*0.01;
		dist = intersect(time, ray, ref, nml, sphere, doAA_, target);
		sphere.spec *= min(1.0, mix(-1.0, 1.0, abs(picked-target)));
		ncol += (1.0-fog)*diff * shade(ray, ref, nml, dist, sphere, doAA_);
		fog = clamp(dist / FOG_D, 0.0, 1.0);
		fog *= fog;
		// second reflection
#endif
		//if (oSphere.radius / odist < 1.0) {
		//	break;
		//}
#ifdef SECOND_BOUNCE
		if (sphere.radius > 0.0) {
			diff *= sphere.color;
			ref = reflect(ref, nml);
			ray += +ref*0.01;
			dist = intersect(time, ray, ref, nml, sphere, doAA_, target);
			sphere.spec *= min(1.0, mix(-1.0, 1.0, abs(picked-target)));
			ncol += (1.0-fog)*diff * shade(ray, ref, nml, dist, sphere, doAA_);
		}
#endif
	//}
	return ncol / k;
}

void main(void)
{
	float xOff = 0.0;
#ifdef OCULUS
	xOff = 1.0;
	if (gl_FragCoord.x < iResolution.x*0.5) xOff = -1.0;
#endif

	vec3 eye = vec3(-xOff*0.5, 0.0, 0.0) + iCamera.xyz;

	vec3 mdir;
	mdir = getDir(iGlobalTime, iMouse.zw);
	
	vec3 nml = vec3(0.0);		
	vec3 col = vec3(0.0);
	
	tSphere sphere;
	float doAA, doAA_;
	
	float shutterSpeed = 1.0 / 30.0;
	float iso = 100.0;
	float exposureCompensation = +1.0;
	
	// Auto ISO
	iso = 1.0 / shutterSpeed;
	
	float picked = iPick;
	float k = 0.0;
	const float mblur_sample_count = float(MBLUR_SAMPLES);
	float box_size = ceil(sqrt(mblur_sample_count));
	for (int dti = 0; dti < MBLUR_SAMPLES; dti++) {
		float dt = float(dti);
		k++;
		float tx = floor(dt/box_size);
		float ty = dt - tx*box_size;
		vec4 tex = texture2D(iChannel0, mod(gl_FragCoord.xy*box_size+vec2(tx,ty), 256.0)/256.0);
		float time = (iGlobalTime - (tex.r*2.0-dt/mblur_sample_count)*shutterSpeed);

		float i = 0.0;
		vec3 ray = eye;
		float x = floor(0.5*i);
		float y = 1.0-x;
		vec3 dir = getDir(time, gl_FragCoord.xy+(vec2(x,y)*0.5));

		float target = -1.0;
		float dist = intersect(time, ray, dir, nml, sphere, doAA, target);

		sphere.spec *= min(1.0, mix(-1.0, 1.0, abs(picked-target)));
		col += shade(ray, dir, nml, dist, sphere, doAA_);

		if ( sphere.radius > 0.0 )
		{
			col += doReflections(time, ray, dir, nml, sphere, dist, picked);
		}
		if (doAA == -2.0) {
			break;
		}
	}
	col = 1.0 - exp((-col/k) * iso * shutterSpeed * pow(2.0, exposureCompensation));
	gl_FragColor = mix( vec4(0.0), vec4( col, 1.0 ), 0.5-0.5*cos(3.14159*min(1.0, iGlobalTime/1.0)) );
}