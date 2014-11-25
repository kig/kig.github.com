// License CC-Attribution-Sharealike-NonCommercial
precision highp float;
precision mediump int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iOpen;

float noise( vec3 x )
{
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    
    vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
    vec2 rg = texture2D( iChannel0, (uv + 0.5)/256.0, -100.0 ).yx;
    return mix( rg.x, rg.y, f.z );
}

float map(vec3 p) {
    vec3 q = p + 0.2*vec3(3.0, 0.3, 5.0)*iGlobalTime*8.0;
    float n = 0.0, f = 0.5;
    n += f*noise(q); q *= 0.501; f *= 0.503;
    n += f*noise(q); q *= 0.402; f *= 0.502;
    n += f*noise(q); q *= 0.403; f *= 0.5;
    n += f*noise(q); 
    return n;
}

float scene(vec3 p)
{
    return p.y-(-2.0)-map(p)*0.001;
}

vec3 normal(vec3 p, float d)
{
    float e = 0.05;
    float dx = scene(vec3(e, 0.0, 0.0) + p) - d;
    float dy = scene(vec3(0.0, e, 0.0) + p) - d;
    float dz = scene(vec3(0.0, 0.0, e) + p) - d;
    return normalize(vec3(dx, dy, dz));
}

vec3 shadeBg(vec3 nml)
{
    vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
    vec2 uv = (2.0 * gl_FragCoord.xy / iResolution.xy - 1.0) * aspect;
    vec3 bgLight = normalize(vec3(
        sin(iGlobalTime*0.5)*0.5,
        cos(iGlobalTime*0.4321)*0.7 - 0.3,
        -1.0
    ));
    vec3 moonLight = normalize(vec3(
        sin(3.14159+iGlobalTime*0.1)*0.15,
        cos(3.14159+iGlobalTime*0.9321)*0.7 - 0.3,
        -1.0
    ));
    float moonD = dot(moonLight, nml) > 0.995 ? 1.0 : 0.0;
    float sunD = dot(bgLight, nml) > 0.995 ? 1.0 : 0.0;
    vec3 sun = vec3(6.5, 3.5, 2.0);
    float skyPow = dot(nml, vec3(0.0, -1.0, 0.0));
    float centerPow = 0.0; //-dot(uv,uv);
    float horizonPow = pow(1.0-abs(skyPow), 3.0)*(5.0+centerPow);
    float sunPow = dot(nml, bgLight);
    float sp = max(sunPow, 0.0);

    float moonPow = dot(nml, moonLight);
    float mp = max(moonPow, 0.0);

    float darkness = clamp(bgLight.y*3.0, 0.0, 1.0);
    float eclipse = max(0.0, dot(moonLight, bgLight) - 0.995)*200.0;
    darkness = min(1.0, darkness + eclipse*eclipse);
    float lightness = 1.0 - (darkness * 0.4);

    if (moonD == 1.0 && sunD == 1.0) {
        moonD = 0.0;
        sunD = 0.0;
    }

    float scattering = clamp(1.0 - abs(2.0*(-bgLight.y)), 0.0, 1.0);
    vec3 bgCol = max(0.0, skyPow)*2.0*vec3(0.8);
    bgCol += 0.5*vec3(0.8)*(horizonPow);
    bgCol += sun*(sunD+pow( (1.0 - pow(mp,1024.0))*sp, max(128.0, abs(bgLight.y)*512.0) ));
    bgCol += vec3(0.4,0.2,0.15)*(pow( sp, 8.0) + pow( sp, max(8.0, abs(bgLight.y)*128.0) ));
    bgCol *= mix(vec3(0.7, 0.85, 0.95), vec3(1.0, 0.45, 0.1), scattering);
    bgCol *= lightness;
    bgCol += vec3(clamp(bgLight.y*3.0, 0.00, 0.4))*(max(moonD, pow(mp, 512.0)));
    return pow(max(vec3(0.0), bgCol), vec3(2.6));
}

mat3 rotationXY( vec2 angle ) {
    float cp = cos( angle.x );
    float sp = sin( angle.x );
    float cy = cos( angle.y );
    float sy = sin( angle.y );

    return mat3(
         cy, -sy, 0.0,
         sy,  cy, 0.0,
        0.0, 0.0, 1.0
    ) * mat3(
        cp, 0.0, -sp,
        0.0, 1.0, 0.0,
        sp, 0.0, cp
    );
}

void main(void)
{
    vec2 aspect = vec2(iResolution.x/iResolution.y, 1.0);
    vec2 uv = (2.0 * (gl_FragCoord.xy / iResolution.xy) - 1.0) * aspect;
    mat3 rot = rotationXY( vec2( 0.5*cos(0.6*iGlobalTime*.8123), -0.15*sin(0.6*iGlobalTime*.8123) ) );
    vec3 d = rot * normalize(vec3(uv, 1.0));
    vec3 p = vec3(uv*-2.0, -9.5);
    vec3 tr = vec3(1.0);
    if (d.y < 0.0) {
        float dist = -2.0 / d.y - p.y / d.y; // p.y + d.y * dist = -2.0;
        p += d * dist;
        vec3 nml = normal(p, 0.0);
        float f = 1.0-pow(1.0-dot(d, -nml), 5.0);
        nml = mix(vec3(0.0, 1.0, 0.0), nml, f);
        d = reflect(d, nml);
        tr *= mix(vec3(1.0), 0.5*vec3(0.5, 0.9, 0.75), f);
    }
    
    
    // Flare adapted from Dave Hoskins' weather shader
    vec3 bgLight = -normalize(vec3(
        sin(iGlobalTime*0.5)*0.5,
        cos(iGlobalTime*0.4321)*0.7 - 0.3,
        -1.0
    ));

    vec2 sunPos = vec2( dot( bgLight, rot[0] ), dot( bgLight, rot[1] ) );
    vec3 sunColour = vec3(6.5, 3.5, 2.0) / 6.5;
    float scattering = clamp(1.0 - abs(2.0*(-bgLight.y)), 0.0, 1.0);
    sunColour *= mix(vec3(0.7, 0.85, 0.95), vec3(1.0, 0.45, 0.1), scattering);
    sunColour *= 1.0 - clamp(-bgLight.y*3.0, 0.0, .6);
    vec2 uvT = uv-sunPos;
    uvT = uvT*(length(uvT));
    float bri = dot(rot[2], bgLight) * 2.7 * 0.25 * clamp((bgLight.y+0.1)/0.1, 0.0, 1.0);
    bri = pow(bri, 6.0)*.6;

    float glare1 = max(1.2-length(uvT+sunPos*4.)*2.0, 0.0);
    float glare2 = max(1.2-length(uvT+sunPos*.5)*4.0, 0.0);
    uvT = mix (uvT, uv, -2.3);
    float glare3 = max(1.2-length(uvT+sunPos*5.0)*1.2, 0.0);
    
    vec3 col = tr * shadeBg(-d);

    col += bri * sunColour * vec3(1.0, .5, .2)  * pow(glare1, 10.0)*25.0;
    col += bri * vec3(.8, .8, 1.0)*sunColour * pow(glare2, 8.0)*15.0;
    col += bri * sunColour * pow(glare3, 4.0)*10.0;
    
    vec4 noise = (texture2D(iChannel0, mod(gl_FragCoord.xy/256.0, 1.0))-0.5) / 64.0;
    gl_FragColor = vec4( noise.rgb + (1.0 - exp(-1.3 * col)), 1.0 );
}