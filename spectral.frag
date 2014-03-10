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

struct ray
{
	vec3 p;
	vec3 d;
	vec3 light;
	vec3 transmit;
};

struct sphere
{
	vec3 p;
	float r;
};

float raySphereDet(ray r, sphere s, inout float b)
{
	vec3 rc = r.p-s.p;
	float c = dot(rc, rc);
	c -= s.r*s.r;
	b = dot(r.d, rc);
	return b*b - c;
}

float rayIntersectsSphere(ray r, sphere s, inout vec3 nml, float closestHit)
{
	float b;
	float d = raySphereDet(r, s, b);
	if (d < 0.0) {
		return closestHit;
	}
	float t = -b - sqrt(d);
	float nd = sign(t);
	if (t < 0.0) {
		t += 2.0*sqrt(d);
	}
	if (t < 0.0 || t > closestHit) {
		return closestHit;
	}
	nml = nd * normalize(s.p - (r.p + r.d*t));
	return t;
}

float rayIntersectsPlane(ray r, vec3 p, vec3 pnml, inout vec3 nml, float closestHit)
{
	float pd = dot(pnml, r.d);
	float dist = dot(pnml, p-r.p) / pd;
	if (abs(pd) > 0.00001 && dist > 0.0 && dist < closestHit) {
		nml = pnml;
		if (pd < 0.0) nml = -nml;
		return dist;
	}
	return closestHit;
}

float rayIntersectsDisk(ray r, vec3 p, vec3 pnml, float r1, float r2, inout vec3 nml, float closestHit)
{
	vec3 tmp;
	float dist = rayIntersectsPlane(r, p, pnml, tmp, closestHit);
	float len = length(r.p + dist*r.d - p);
	if (dist != closestHit && len >= r1 && len <= r2) {
		nml = tmp;
		return dist;
	}
	return closestHit;
}

vec3 shadeBg(float time, vec3 nml)
{
	vec3 lightPos_ = vec3(
		-cos(time)*-12.0, 
		3.5+sin(time*2.05)*8.0, 
		(sin(time)*12.0-5.4)
	);
	
	vec3 bgLight = normalize(lightPos_);
	vec3 lightPos = bgLight * 9999.0;
	vec3 sun = vec3(5.0, 4.0, 2.0);

	vec3 bgCol = vec3(0.2, 0.15, 0.1);
	float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	bgCol += 0.1*sun*pow( max(sunPow, 0.0), 2.0);
	bgCol += 2.0*bgCol*pow( max(-sunPow, 0.0), 2.0);
	bgCol += max(-0.5, bgDiff)*vec3(0.25, 0.5, 0.5);
	bgCol += sun*pow( max(sunPow, 0.0), 256.0); //16.0+abs(bgLight.y)*256.0);
	bgCol += bgCol*pow( max(sunPow, 0.0), 128.0+abs(bgLight.y)*128.0);
	return max(vec3(0.0), bgCol);
}

mat3 rotationXY( vec2 angle ) {
	float cp = cos( angle.x );
	float sp = sin( angle.x );
	float cy = cos( angle.y );
	float sy = sin( angle.y );

	return mat3(
		cy     , 0.0, -sy,
		sy * sp,  cp,  cy * sp,
		sy * cp, -sp,  cy * cp
	);
}

bool getBit(float n, float i)
{
	return (mod(n / pow(2.0, i), 2.0) < 1.0);
}

float scene(inout ray r, inout vec3 nml) {
	float dist;
	sphere s;

	float angleStep = 3.14159/2.0;
	float angleO = (iGlobalTime / 1.0);
	float angleF = fract(angleO);
	float angleG = floor(angleO);
	angleF = 0.5 - 0.5*cos(angleF*3.14159);
	angleF = angleF*angleF*angleF;
	float angle = angleG * angleStep + angleF * angleStep;

	mat3 rot = rotationXY( vec2( angle, angle ) );

	// Test a bunch of spheres for ray-sphere intersection.
	dist = 10000.0;
	s.p = vec3(0.0);
	s.r = 0.95;
	dist = rayIntersectsSphere(r, s, nml, dist);
	s.p = vec3(1.0, 1.0, -1.0) * rot;
	s.r = 0.25;
	dist = rayIntersectsSphere(r, s, nml, dist);
	s.p = vec3(1.0, -1.0, 1.0) * rot;
	s.r = 0.25;
	dist = rayIntersectsSphere(r, s, nml, dist);
	s.p = vec3(-1.0, -1.0, -1.0) * rot;
	s.r = 0.25;
	dist = rayIntersectsSphere(r, s, nml, dist);
	s.p = vec3(-1.0, 1.0, 1.0) * rot;
	s.r = 0.25;
	dist = rayIntersectsSphere(r, s, nml, dist);
	//dist = rayIntersectsDisk(r, vec3(0.0, 0.5, 0.0), vec3(0.0, 1.0, 0.0), 0.0, 9.0, nml, dist);
	//dist = rayIntersectsDisk(r, 1.3*vec3(1.0, -1.0, 1.0), normalize(vec3(-1.0, 1.0, -1.0)), 0.0, 2.0, nml, dist);
	return dist;
}

void main(void)
{
	vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);
	vec2 uv = (1.0 - 2.0 * (gl_FragCoord.xy / iResolution.xy)) * aspect;

	float time = 616.89 + iRot;
	mat3 rot = rotationXY( vec2( time, time*0.32 ) );

	ray r;
	r.p = vec3(uv*0.2, -3.0);
	r.d = normalize(vec3(uv, 1.0));
	r.d *= rot;
	r.p *= rot;
	r.transmit = vec3(1.0);
	r.light = vec3(0.0);

	float epsilon = 0.015;
	float rayCount=0.0, rayBounceCount=0.0;
	bool rayComplete = false;

	vec3 rgb = vec3(0.0);
	
	// Max number of paths shot out of camera.
	// Double to add a recursion level.
	float maxRays = 24.0;
	float maxBounceCount = 5.0;
	
	// Evaluate a bunch of ray segments.
	// Bump maxRays to 64.0, maxBounceCount to 7.0 and the ray segments to 64*7 
	// for some more flares.
	for (int i=0; i<24*5*3; i++) {
		
		vec3 nml;
		float dist = scene(r, nml);
		
		if (dist != 10000.0) {
			// Move ray to surface.
			r.p += r.d*dist;
			
			// Fresnel term, increase reflectivity on surfaces parallel to ray.
			float f = pow(1.0 - clamp(0.0, 1.0, dot(nml, r.d)), 5.0);
			
			// Whether to reflect or refract on this step.
			// The idea is to generate all permutations of a reflect/refract
			// path by using an N-bit number where each bit determines whether
			// the bounce at this step reflects or refracts.
			//
			// (rayCount >> rayBounceCount) & 1
			if (!getBit(floor(rayCount / 3.0), rayBounceCount)) {
				r.d = reflect(r.d, nml);
				// Fade the ray by the surface's absorption.
				// Use the Fresnel term to boost reflection strength.
				r.transmit *= (1.0+f)*vec3(1.0);
			} else {
				// Figure out which wavelength we're tracing.
				// 0 = red, 1 = green, 2 = blue
				float c = mod(rayCount, 3.0);
				// Simulate air -> diamond refraction.
				// Change index of refraction by the wavelength.
				float eta = 1.000239 / pow(2.4, (c*0.07)+1.0); 
				r.d = refract(r.d, -nml, eta);
				// Fade the ray by the volume's transmission.
				// Use the Fresnel term to reduce transmission.
				r.transmit *= (1.0-f)*vec3(1.0);
			}
			
			rayBounceCount++;
			if (rayBounceCount > maxBounceCount) {
				rayComplete = true;
			}
			
			// Offset ray to avoid double-colliding with same surface.
			r.p += r.d*epsilon;
			
		} else {
			
			// Add background light to the ray.
			r.light = r.transmit * shadeBg(time, -r.d);
			// Use only the wanted wavelength.
			float c = mod(rayCount, 3.0);
			if (c == 0.0) {
				rgb.r += r.light.r; 
			} else if (c == 1.0) {
				rgb.g += r.light.g;
			} else {
				rgb.b += r.light.b;
			}
			rayComplete = true;
			
		}
		
		if (rayComplete) {
			
			rayComplete = false;
			rayCount++;
			
			// If the ray didn't hit anything or
			// if we've done enough rays, quit.
			if ((rayBounceCount == 0.0 && rayCount == 1.0) || rayCount == maxRays) {
				if (rayCount == 1.0) {
					rayCount = 3.0;
					rgb.gb += r.light.gb;
				}
				break;
			}
			
			// Reset bounce count.
			rayBounceCount = 0.0;
			
			// Reset ray back to camera.
			r.p = vec3(uv*0.2, -3.0);
			r.d = normalize(vec3(uv, 1.0));
			r.d *= rot;
			r.p *= rot;
			
			// Make ray transparent again.
			r.transmit = vec3(1.0);
		}
	}
	
	// Gamma curve the average ray light.
	gl_FragColor = vec4(1.0 - exp(-rgb*3.0/rayCount * 2.5), 1.0);
}