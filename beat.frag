precision highp float;
precision highp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iOpen;

vec3 shadeBg(vec3 nml)
{
    vec3 lightPos_ = vec3( sin(iGlobalTime)*0.1, cos(iGlobalTime)*0.15, 1.0 );
//        -cos(iGlobalTime*0.1)*-8.5,
//        3.5+sin(iGlobalTime*0.05)*3.0,
//        -(sin(iGlobalTime*0.1)*4.0-5.4)
//    );
    vec3 bgLight = normalize(lightPos_);
    vec3 lightPos = bgLight * 9999.0;
    vec3 sun = vec3(5.0, 3.5, 6.0)*0.08;

    vec3 bgCol = vec3(0.2, 0.15, 0.3);
    float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
    float sunPow = dot(nml, bgLight);
    bgCol += 0.1*sun*pow( max(sunPow, 0.0), 2.0);
    bgCol += 0.5*bgCol*pow( max(-sunPow, 0.0), 2.0);
    bgCol += bgDiff*vec3(0.5, 0.15, 0.35);
    bgCol += sun*pow( max(sunPow, 0.0), abs(bgLight.y)*256.0);
    bgCol += bgCol*pow( max(sunPow, 0.0), abs(bgLight.y)*128.0);
    
    float d = dot(nml, vec3(0.0,0.0,1.0));
    float r = -tan(-0.25*3.14159+iGlobalTime/3.14159*8.0)*0.1 + 0.9;
    float r1 = r/0.95;
    float r0 = r*0.95;
    if (d < r1 && d > r0) {
        d = 0.5 - (smoothstep(d, r0, r0+(r1-r0)/2.0)+smoothstep(d, r1, r0+(r1-r0)/2.0));
        d *= 2.0;
        d = d*d*d;
        d *= 0.5;
    } else {
        d = 0.0;
    }
    bgCol += vec3(0.9, 0.3, 1.0) * d;
    
    return max(vec3(0.0), bgCol);
}


void main(void)
{
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = (0.5 - uv) * 2.0;
    uv.x *= iResolution.x / iResolution.y;
    float a = sin(iGlobalTime/3.53423)*2.0;
    float ca = cos(a), sa = sin(a);
    uv *= mat2(ca, sa, -sa, ca);
    vec3 ro = vec3(0,0,-3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    float r = 0.4*abs(sin(8.0*iGlobalTime/3.14159))+0.5;
    for (int i=0; i<20; i++) {
        float d = length(ro)-r;
        if (d < 0.01) {
            vec3 nml = normalize(ro);
            float f = 1.0-abs(dot(nml, rd));
            rd = normalize(mix(reflect(rd, nml), rd, f));
            break;
        } else {
            ro += rd * d;
        }
    }
    gl_FragColor = vec4(shadeBg(rd), 1.0);
}