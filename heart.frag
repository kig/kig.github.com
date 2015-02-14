precision highp float;
precision highp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iOpen;

float heartCurve(vec3 v) {
    float d = dot(v,v)-1.0;
    return d*d*d - v.x*v.x*v.y*v.y*v.y;
}

vec3 shadeBg(vec3 nml)
{
    vec3 lightPos_ = vec3( sin(iGlobalTime)*0.1, -0.15+0.0*cos(3.14159*0.5+iGlobalTime/3.14159*2.0)*0.15, 1.0 );
//        -cos(iGlobalTime*0.1)*-8.5,
//        3.5+sin(iGlobalTime*0.05)*3.0,
//        -(sin(iGlobalTime*0.1)*4.0-5.4)
//    );
    vec3 bgLight = normalize(lightPos_);
    vec3 lightPos = bgLight * 9999.0;
    vec3 sun = vec3(5.0, 3.5, 6.0)*0.03;

    vec3 bgCol = vec3(0.5, 0.15, 0.4)*1.3;
    float bgDiff = dot(nml, vec3(0.0, 1.0, 0.0));
    float sunPow = dot(nml, bgLight);
    bgCol += 0.1*sun*pow( max(sunPow, 0.0), 2.0);
    bgCol += 0.3*bgDiff*vec3(0.4, 0.1, 0.2);
    bgCol += sun*pow( max(sunPow, 0.0), abs(bgLight.y)*256.0);
    bgCol += bgCol*pow( max(sunPow, 0.0), abs(bgLight.y)*128.0);
    
    if (nml.z > 0.0) {
        float r = max(0.0, 0.1*-tan(-0.25*3.14159+iGlobalTime/3.14159*8.0)+0.9);
        //float d = heartCurve(r*vec3(nml.xy*vec2(2.5,-2.5)+vec2(0.0,0.15), 0.0)); 
        float d = dot(nml, vec3(0.0,0.0,1.0));
        float r1 = r/0.8;
        float r0 = r*0.7;
        //float r1 = 0.05, r0 = -0.05;
        if (d < r1 && d > r0) {
            //d = 0.24; 
            d = 0.5 - (smoothstep(d, r0, r0+(r1-r0)/2.0)+smoothstep(d, r1, r0+(r1-r0)/2.0));
            d *= 2.0;
            d = d*d*d;
            d *= 0.5;
        } else {
            d = 0.0;
        }
        bgCol += vec3(0.8, 0.2, 0.8) * d;
    }
    
    return max(vec3(0.0), bgCol);
}

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

float heart(vec3 v) {
    vec3 v2 = v*v;
    float v3 = v2.x + (9.0/4.0)*v2.y + v2.z - 1.0;
    float t = -( v2.x*v2.z*v.z + (9.0/80.0)*v2.y*v2.z*v.z ) + v3*v3*v3;
    return t;
}

void main(void)
{
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv = (0.5 - uv) * 2.0;
    uv.x *= iResolution.x / iResolution.y;
    float a = sin(8.0*iGlobalTime/3.53423)*0.5;
    float ca = cos(a), sa = sin(a);
    uv *= mat2(ca, sa, -sa, ca);
    mat3 rot = rotationMatrix(normalize(vec3(1.0, 0.0, 0.25*sa)), 3.14159*0.5);
    float scale = (-0.8*abs(sin(8.0*iGlobalTime/3.14159))+1.4);
    rot *= scale;
    vec3 ro = vec3(0,0,-3.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    ro += rd * 2.5;
    vec3 transmit = vec3(1.0);
    
    for (int i=0; i<30; i++) {
        vec3 v = rot*(ro+vec3(0.0, -0.35, 0.0));
        float t = heart(v);
        if (t < 0.0) {
            vec3 nml = normalize(ro*vec3(1., 1., 3.4/scale));
            float f = 1.0-abs(dot(normalize(ro), rd));
            f = f*f;
            rd = normalize(mix(reflect(rd, nml), rd, f));
            transmit = 1.25*vec3(1.0, 0.4, 0.5);
            break;
        } else {
            ro += rd * 0.015;
        }
    }
    gl_FragColor = vec4(transmit*shadeBg(rd), 1.0);
}