precision highp float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iOpen;

#define GEMCOUNT 1

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

float rayIntersectsTri(ray r, vec3 v0, vec3 v1, vec3 v2, inout vec2 uv, inout vec3 nml, float closestHit)
{
	vec3 e1,e2,h,s,q;
	float a,f,u,v,t;
	e1 = v1-v0;
	e2 = v2-v0;

	h = cross(r.d,e2);
	a = dot(e1,h);

	f = 1.0 / a;
	s = r.p-v0;
	u = f * dot(s,h);

	q = cross(s,e1);
	v = f * dot(r.d,q);
	
	if (u < 0.0 || u > 1.0 || v < 0.0 || u+v > 1.0) {
		return closestHit;
	}

	// at this stage we can compute t to find out where
	// the intersection point is on the line
	t = f * dot(e2,q);

	if (t > 0.00001 && (a < -0.00001 || a > 0.00001) && t < closestHit) {
		nml = normalize(cross(e1, e2));
		if (dot(nml, r.d) < 0.0) {
			nml = -nml;
		}
		uv = vec2(u,v);
		return t;
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

vec3 shadeBg(vec3 nml)
{
	vec3 lightPos_ = vec3(
		-cos(iGlobalTime)*-12.0, 
		3.5+sin(iGlobalTime*2.05)*8.0, 
		(sin(iGlobalTime)*12.0-5.4)
	);
	vec3 bgLight = normalize(lightPos_);
	//vec3 lightPos = bgLight * 9999.0;
	vec3 sun = vec3(5.0, 4.0, 2.0);
	
	vec3 bgCol = 3.0*vec3(0.025, 0.005, 0.041);
	float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	bgCol += 0.1*sun*pow( max(sunPow, 0.0), 2.0);
	bgCol += sun*pow( max(sunPow, 0.0), 256.0); //16.0+abs(bgLight.y)*256.0);
	bgCol += bgCol*pow( max(sunPow, 0.0), 128.0+abs(bgLight.y)*128.0);
	bgCol += bgDiff * 3.0*vec3(0.005, 0.035, 0.015);
	/*
	bgCol += sun*pow( max(dot(nml, normalize(vec3(0.0, 1.0, 0.0))), 0.0), 512.0);
	bgCol += sun*pow( max(dot(nml, normalize(vec3(0.0, 0.5, -1.0))), 0.0), 512.0);
	bgCol += sun*pow( max(dot(nml, normalize(vec3(-1.0, 0.5, 0.0))), 0.0), 512.0);
	bgCol += sun*pow( max(dot(nml, normalize(vec3(0.0, 0.5, 1.0))), 0.0), 512.0);
	bgCol += sun*pow( max(dot(nml, normalize(vec3(1.0, 0.5, 0.0))), 0.0), 512.0);
*/
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

float gem(ray r, vec3 p, mat3 radius, inout vec3 nml, float dist) {
	sphere s;
	s.p = p;
	s.r = length(vec3(1.0, 0.0, 0.0)*radius);
	float bb, dd;
	dd = raySphereDet(r, s, bb);
	if (dd > 0.0) {
		float a = 0.0, b = 0.0;
		vec2 uv;
		for (int i=0; i<6; i++) {
			b = a + 3.14159 / 3.0;
			dist = rayIntersectsTri(
				r, 
				p+radius*vec3(-1.0, 0.0, 0.0), 
				p+radius*vec3(-0., cos(a), sin(a)), 
				p+radius*vec3(-0., cos(b), sin(b)), 
				uv, nml, dist);
			dist = rayIntersectsTri(
				r, 
				p+radius*vec3(-0., cos(b), sin(b)), 
				p+radius*vec3(-0., cos(a), sin(a)), 
				p+radius*vec3(1.0, 0.0, 0.0), 
				uv, nml, dist);
			//	*/
			
		/*
			dist = rayIntersectsTri(
				r, 
				p+radius*vec3(-0.5, 0.0, 0.0), 
				p+radius*vec3(-0.5, 0.65*cos(a), 0.65*sin(a)), 
				p+radius*vec3(-0.5, 0.65*cos(b), 0.65*sin(b)), 
				uv, nml, dist);
			dist = rayIntersectsTri(
				r, 
				p+radius*vec3(-0.5, 0.65*cos(a), 0.65*sin(a)), 
				p+radius*vec3(-0.25, cos(a), sin(a)), 
				p+radius*vec3(-0.5, 0.65*cos(b), 0.65*sin(b)), 
				uv, nml, dist);
			dist = rayIntersectsTri(
				r, 
				p+radius*vec3(-0.5, 0.65*cos(b), 0.65*sin(b)), 
				p+radius*vec3(-0.25, cos(a), sin(a)), 
				p+radius*vec3(-0.25, cos(b), sin(b)), 
				uv, nml, dist);
			dist = rayIntersectsTri(
				r, 
				p+radius*vec3(-0.25, cos(b), sin(b)), 
				p+radius*vec3(-0.25, cos(a), sin(a)), 
				p+radius*vec3(1.0, 0.0, 0.0), 
				uv, nml, dist);
			// */
			
			a = b;
		}
	}
	return dist;
}

float scene(inout ray r, inout vec3 nml) {
	float dist;
	dist = 10000.0;
	mat3 rot = rotationXY( vec2( iGlobalTime*0.4, iGlobalTime*0.4 ) );

	//dist = gem(r, rot*vec3(0.0), 1., nml, dist);
	//sphere s; s.p = vec3(0.0); s.r = 0.25;
	//dist = rayIntersectsSphere(r, s, nml, dist);

	mat3 m = mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
	
	//for (int i=0; i<GEMCOUNT; i++) {
		float a = 0.0; //float(i) / (float(GEMCOUNT) / 3.14159 / 2.0);
		float ra = 0.0;
		float b = 0.0, c = iRot*6.0;
		float c1 = cos(a), c2 = cos(0.0), c3 = cos(c), s1 = sin(a), s2 = sin(b), s3 = sin(c);
		m = mat3(
			c2*c3,            -c2*s3,           s2,
			c1*s3 + c3*s1*s2, c1*c3 - s1*s2*s3, -c2*s1,
			s1*s3 - c1*c3*s2, c3*s1 + c1*s2*s3, c1*c2
		) * 0.5; //* (0.66 * (1.0+0.5*sin(4.0*iGlobalTime+a)));
		dist = gem(r, vec3(0.0, ra*cos(a), ra*sin(a)), m, nml, dist);
	//}
	/*
	dist = gem(r, rot*vec3(0.0, 1.0, 1.0), 0.25, nml, dist);
	dist = gem(r, rot*vec3(0.0, -1.0, -1.0), 0.25, nml, dist);
	dist = gem(r, rot*vec3(0.0, -1.0, 1.0), 0.25, nml, dist);
	dist = gem(r, rot*vec3(0.0, 1.0, -1.0), 0.25, nml, dist);

	dist = gem(r, rot*vec3(0.0, 1.414, 0.0), 0.25, nml, dist);
	dist = gem(r, rot*vec3(0.0, -1.414, 0.0), 0.25, nml, dist);
	dist = gem(r, rot*vec3(0.0, 0.0, 1.414), 0.25, nml, dist);
	dist = gem(r, rot*vec3(0.0, 0.0, -1.414), 0.25, nml, dist);
	*/
	return dist;
}

void main(void)
{
	vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);
	if (iResolution.x < iResolution.y) {
		aspect = vec2(1.0, iResolution.y / iResolution.x);
	}
	vec2 uv = (1.0 - 2.0 * (gl_FragCoord.xy / iResolution.xy)) * aspect;

	mat3 rot = rotationXY( vec2( iGlobalTime, iGlobalTime*0.32 ) );

	ray r;
	r.p = vec3(uv*0.2, -3.0);
	r.d = normalize(vec3(uv, 1.0));
	r.d *= rot;
	r.p *= rot;
	r.transmit = vec3(1.0);
	r.light = vec3(0.0);

	float epsilon = 0.002;
	float rayCount=0.0, rayBounceCount=0.0;
	bool rayComplete = false;

	vec3 rgb = vec3(0.0);
	
	// Max number of paths shot out of camera.
	// Double to add a recursion level.
	float maxRays = 32.0;
	float maxBounceCount = 5.0;
	
	// Evaluate a bunch of ray segments.
	// Bump maxRays to 64.0, maxBounceCount to 7.0 and the ray segments to 64*7 
	// for some more flares.
	for (int i=0; i<32*5*3; i++) {
		
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
			if (!getBit(floor(rayCount), rayBounceCount)) {
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
			r.light = r.transmit * shadeBg(-r.d);
			// Use only the wanted wavelength.
			//rgb += r.light;
			
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
					rgb.gb += r.light.gb;
					rayCount = 3.0;
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
	gl_FragColor = vec4(1.0 - exp(-rgb*3.0/rayCount * 2.8), 1.0);
}