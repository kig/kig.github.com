precision highp float;
precision lowp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iRot2;
uniform float iOpen;

void main(void)
{
	vec2 uv = vec2(iResolution.x/iResolution.y,1.0) * (-1.0 + 2.0*gl_FragCoord.xy / iResolution.xy);
   
    vec2 ouv = uv;
    
    float a = sin(iGlobalTime*0.5)*0.2;
    float ca = cos(a);
    float sa = sin(a);
    
    uv *= mat2(ca, sa, -sa, ca);

    float df = abs(uv.y+1.3)*uv.x*uv.x;
    uv *= 3.0+1.9*df;
    uv.x += iGlobalTime*2.0;
    uv.y += iGlobalTime*2.0;
    
    uv *= 2.0;

    uv.x = pow(sin(uv.x+iGlobalTime*2.0) * cos(uv.y*3.0) * cos(uv.x*3.0+1.0), 4.0);
    uv.y = abs(sin(uv.y*16.0) * cos(uv.x*12.0) * sin(uv.y*1.0+3.14159*0.5));

    uv = pow(uv, vec2(1.0, 4.0));
    
	gl_FragColor = (1.0-pow(0.5*length(ouv), 3.0)) * vec4(uv.x+uv.x+0.1, 0.05+uv.y+uv.x, 0.25+uv.y, 1.0);
	gl_FragColor.a = 1.0;
}