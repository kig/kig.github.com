precision highp float;
precision lowp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iRot2;
uniform float iOpen;

#define THRESHOLD 0.001
#define MAX_DISTANCE 8.0

#define RAY_STEPS 60

#define PI 3.14159

mat3 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);  
}

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
	vec3 q = p + 0.2*vec3(0.0, 1.0, 2.2)*iGlobalTime;
	float f;
    f = 0.500*noise( q ); q = q*2.0;
    f += 0.25*noise( q ); q = q*2.0;
    f += 0.125*noise( q ); q = q*2.0;
//    f += 0.0625*noise( q ); q = q*2.0;
//    f += 0.03125*noise( q ); q = q*2.0;
//    f += 0.015625*noise( q );
	return f;
}

float sdTriPrism( vec3 p, vec2 h )
{
    vec3 q = abs(p);
    float hFac = clamp(0.5+0.5*(p.y / h.y), 0.0, 1.0);
    h.x *= hFac;
    return max(q.y-h.y, max((q.x*0.866025 + p.z*0.5), -p.z) - h.x*0.5);
}

float sdBox( vec3 p, vec3 b )
{
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) +
         length(max(d,0.0));
}

float udBox( vec3 p, vec3 b )
{
  return length(max(abs(p)-b,0.0));
}

float lionL(vec3 p) {
	return min(
		udBox(p-vec3(-1.0, 0.7, 0.0), vec3(0.1, 0.5, 0.1)),
		udBox(p-vec3(-0.75, 0.2, 0.0), vec3(0.5, 0.1, 0.1))
	);
}

float lionI(vec3 p) {
	mat3 rot = rotationMatrix(vec3(0.0, 1.0, 0.0), iGlobalTime-iRot*4.0);
	mat3 rot2 = rotationMatrix(vec3(0.0, 1.0, 1.0), 1.5);

	p = rot*p;
	return max(
		sdTriPrism(p-vec3(0.0, 0.7, 0.0), vec2(0.25, 0.7)),
		-sdBox((rot2*(p-vec3(0.0, 0.7, 0.0))-vec3(0.0, -0.05, 0.0)), vec3(0.5, 0.02, 0.5))
	);
}

float lionLogo(vec3 p) {
	return lionI(p); //min(lionL(p), lionI(p));
}

float scene(vec3 p)
{
	float m = 0.0;
	if (p.y < 0.0) {
		m = pow(map(p), 6.0) * -1.3;
	}
	return min(lionLogo(p), (m + 0.7 + p.y));
}

vec3 normal(vec3 p, float d)
{
	float e = p.y < 0.0 ? 0.05 : 0.001;
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
		0.0, //cos(t*0.2/0.954929658551372)*4.0, 
		3.0, //sin(t/1.1936620731892151)*3.0 - 4.0, 
		-8.0 //sin(t*0.2/0.954929658551372)*8.0
	));
	vec3 sun = vec3(1.0);
	float bgDiff = dot(nml, vec3(0.0, -1.0, 0.0));
	float sunPow = dot(nml, bgLight);
	float sp = max(sunPow, 0.0);
	vec3 bgCol = max(0.0, bgDiff)*2.0*vec3(1.5);
	bgCol += max(0.0, -bgDiff)*vec3(0.6);
	bgCol += vec3(0.3)*((0.5*pow(1.0-abs(bgDiff), 5.0)*(5.0-dot(uv,uv))));
	bgCol += sun*(0.5*pow( sp, 3.0)+pow( sp, 256.0));
	bgCol += vec3(0.8)*(pow( sp, 8.0) + pow( sp, abs(bgLight.y)*128.0));
    bgCol += vec3(0.5) * ((1.0-pow(abs(bgDiff), 0.6)) * 1.0 * map(-nml) * map(-nml*nml.y));
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
	vec3 p = vec3(uv*-2.0, -6.5) + d*1.6;
	float a = 0.2;
	vec2 uvR = uv * mat2(cos(a), 0.3+sin(a), -sin(a), cos(a));
	float uvD = max(abs(uvR.x*2.0), abs(uvR.y*0.3));
//	if (uvD > 0.7 && (uvR.x < 0.0 || fragCoord.y > 50.0)) {
//		fragColor = vec4(0.0, 0.0, 0.0, 1.0);
//		return;
//	}

	float fragAlpha = 1.0; //clamp(1.0 - (uvD - 0.69) / 0.01, 0.0, 1.0);
	if (uv.y > 0.4) {
		fragColor = vec4( fragAlpha * (1.0 - exp(-0.3 * shadeBg(-d, fragCoord))), 1.0 );
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
	fragColor = vec4( fragAlpha * (1.0 - exp(-0.3 * shadeBg(-d, fragCoord))), 1.0 );
}

void main() {
	vec4 c = vec4(0.0), accum = vec4(0.0);
	mainImage(c, gl_FragCoord.xy); accum += c;
	// mainImage(c, gl_FragCoord.xy+vec2(0.5, 0.5)); accum += c;
	accum.rgb -= 0.1*texture2D(iChannel0, vec2(mod(floor(iGlobalTime*83956.0), 256.0) + gl_FragCoord.x, mod(floor(iGlobalTime*91081.0)+c.r*256.0, 257.0) + gl_FragCoord.y)/256.0, -100.0).r;
	gl_FragColor = vec4(accum.rgb, 1.0);
}