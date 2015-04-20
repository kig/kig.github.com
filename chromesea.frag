precision highp float;
precision lowp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iRot2;
uniform float iOpen;

#define THRESHOLD 0.005
#define MAX_DISTANCE 2.0

#define RAY_STEPS 30


// iq's LUT based 3d value noise
float noise( in vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	
	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = texture2D( iChannel0, (mod(uv,256.0) + 0.5)/256.0, -100.0 ).yx;
	return mix( rg.x, rg.y, f.z );
}

float map( in vec3 p )
{
	vec3 q = p + 0.2*vec3(-1.0, 1.0, 2.2)*iGlobalTime;
	float f;
    f = 0.500*noise( q ); q = q*2.0;
    f += 0.25*noise( q ); q = q*2.0;
    f += 0.125*noise( q ); q = q*2.0;
//    f += 0.0625*noise( q ); q = q*2.0;
//    f += 0.03125*noise( q ); q = q*2.0;
//    f += 0.015625*noise( q );
	return f;
}


float scene(vec3 p)
{
	return min(length(p-vec3(0.0, 0.9, 0.0))-0.7, (pow(map(p), 6.0)*-2.0+0.2+0.5+p.y));
}

vec3 normal(vec3 p, float d)
{
	float e = 0.05;
	float dx = scene(vec3(e, 0.0, 0.0) + p) - d;
	float dy = scene(vec3(0.0, e, 0.0) + p) - d;
	float dz = scene(vec3(0.0, 0.0, e) + p) - d;
	return normalize(vec3(dx, dy, dz));
}

vec3 shadeBg(vec3 nml, vec2 fragCoord)
{
	vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
	vec2 uv = (2.0 * fragCoord.xy / iResolution.xy - 1.0) * aspect;
    float t = 144.57;
	vec3 bgLight = normalize(vec3(
		cos(t*0.2/0.954929658551372)*4.0, 
		sin(t/1.1936620731892151)*3.0 - 4.0, 
		sin(t*0.2/0.954929658551372)*8.0
	));
	vec3 sun = vec3(3.0, 1.0, 0.5);
	float bgDiff = dot(nml, vec3(0.0, -1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	float sp = max(sunPow, 0.0);
	vec3 bgCol = max(0.0, bgDiff)*2.0*vec3(0.4, 0.7, 1.0);
	bgCol += max(0.0, -bgDiff)*vec3(0.4, 0.55, 0.7);
	bgCol += vec3(0.2, 0.5, 0.7)*((0.5*pow(1.0-abs(bgDiff), 5.0)*(5.0-dot(uv,uv))));
	bgCol += sun*(0.5*pow( sp, 3.0)+pow( sp, 256.0));
	bgCol += vec3(0.5, 0.2, 0.15)*(pow( sp, 8.0) + pow( sp, abs(bgLight.y)*128.0));
    bgCol += vec3(1.9,0.,0.9) * ((1.0-pow(abs(bgDiff), 0.6)) * 1.0 * map(-nml) * map(-nml*nml.y));
	return pow(max(vec3(0.0), bgCol), vec3(1.9));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
	if (iResolution.x < iResolution.y) {
		aspect = vec2(1.0, iResolution.y / iResolution.x);
	}
	vec2 uv = (2.0 * fragCoord.xy / iResolution.xy - 1.0) * aspect;
	vec3 d = normalize(vec3(uv, 1.0));
	vec3 p = vec3(uv*-2.0, -6.5) + d*3.6;
	if (uv.y > 0.4) {
		fragColor = vec4( 1.0 - exp(-1.3 * shadeBg(-d, fragCoord)), 1.0 );
		return;
	}
    for (int i=0; i<RAY_STEPS; i++) {
        float dist = scene(p);
        if (dist < THRESHOLD) {
            vec3 nml = normal(p, dist);
            d = reflect(d, nml);
            p += (23.0*THRESHOLD) * d;
        }
        if (dist > MAX_DISTANCE) {
            break; 
        }
        p += dist * d;
    }
	fragColor = vec4( 1.0 - exp(-1.3 * shadeBg(-d, fragCoord)), 1.0 );
}

void main() {
	mainImage(gl_FragColor, gl_FragCoord.xy);
}