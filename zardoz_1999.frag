precision lowp float;
precision lowp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iRot2;
uniform float iOpen;

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

vec2 hash2( float n )
{
    return fract(sin(vec2(n,n+1.0))*vec2(43758.5453123,22578.1459123));
}

vec3 hash3( float n )
{
    return fract(sin(vec3(n,n+1.0,n+2.0))*vec3(43758.5453123,22578.1459123,19642.3490423));
}

// from iq
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	
	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = texture2D( iChannel0, (uv + 0.5)/256.0, -100.0 ).yx;
	return mix( rg.x, rg.y, f.z );
}

// iq's cloud fBm with flow direction tweaks & exponential y-scale
float map( in vec3 p )
{
	p.y = pow(p.y, 1.3);
	
	float d = -0.1 - p.y;

	vec3 dir = 8.0*normalize(p);
	dir.y = 0.0;
	vec3 q = p - dir+vec3(-0.0,3.0,-0.0)*(0.2*iGlobalTime);
	float f;
	f  = 0.5000*noise( q ); q = q*2.02;
	f += 0.2500*noise( q ); q = q*2.03;
	f += 0.1250*noise( q ); q = q*2.01;
	f += 0.0625*noise( q );

	d += 3.5 * f;

	d = clamp( d, 0.0, 1.0 );
	
	return d*d;
}

vec3 lightPos_ = vec3(0.5, -1.5, 8.0);
/*
vec3 lightPos_ = vec3(
	cos(iGlobalTime*0.2)*4.0, 
	sin(iGlobalTime)*3.0 - 4.0, 
	sin(iGlobalTime*0.2)*8.0
);
*/
vec3 bgLight = normalize(lightPos_);
vec3 lightPos = bgLight * 9999.0;
vec3 sun = vec3(2.0)*4.0; //, 3.5, 2.0)*4.0;

vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
vec2 uv = (2.0 * gl_FragCoord.xy / iResolution.xy - 1.0) * aspect;

vec3 shadeBg(vec3 nml)
{
	
	vec3 bgColz = vec3(0.5, 0.2, 0.15);
	float bgDiff = dot(nml, vec3(0.0, -1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	float sp = max(sunPow, 0.0);
	vec3 bgCol = vec3(0.0);
	bgCol += max(0.0, bgDiff)*vec3(0.25, 0.5, 0.6);
	bgCol += max(0.0, -bgDiff)*vec3(0.3, 0.2, 0.3);
	bgCol += vec3(0.43, 0.07, 0.25)*(pow(1.0-abs(bgDiff), 16.0)*(0.2*dot(uv,uv)));
	bgCol += 0.02*sun*pow( sp, 3.0);
	bgCol += bgColz*pow( sp, 8.0);
	bgCol += sun*pow( sp, 256.0);
	bgCol += bgColz*pow( sp, abs(bgLight.y)*128.0);
	return bgCol;
}

ray setupRay(vec2 uv, float k) {
	mat3 rot = rotationXY( vec2( -0.603, 3.14159*0.25 )); //iGlobalTime*0.0602 ) );
	ray r;
	r.light = vec3(0.0);
	r.transmit = vec3(1.0);
	r.p = rot * vec3(uv*-1.0, -7.5) + vec3(0.0, 3.0, 0.0);
	r.d = rot * normalize(vec3(uv, 1.0));

	return r;
}

void main(void)
{
	vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
	uv = (2.0 * uv - 1.0) * aspect;

	vec2 uvD = 2.0*aspect / iResolution.xy;
	
	ray r;
	r = setupRay(uv, 0.0);
	
	float dist;
	
	vec3 light = shadeBg(-r.d);
	r.p += 4.6*r.d;
	for (int i=0; i<10; i++) {
	  float c = map( r.p );
	  r.p += 0.7*r.d;
	  r.transmit *= 1.0+c*0.09;
	}
	r.light = r.transmit * light;
	
	gl_FragColor = mix( vec4(0.0, 0.0, 0.0, 1.0), vec4( 1.0 - exp(-1.5 * r.light), 1.0 ), min(1.0, iGlobalTime/3.0) );
}
