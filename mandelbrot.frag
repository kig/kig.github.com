precision highp float;
precision highp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iOpen;

float mandelbrot(vec2 uv) {
    float cr = 2.0 * uv.x;
  	float ci = 2.0 * uv.y;
    float zr = 0.0;
    float zi = 0.0;
    float limit = 4.0;
    float c = -3.0;
    for (int i = 0; i < 10; i++) {
        float nzr = zr * zr - zi * zi + cr;
        float nzi = 2.0 * zr * zi + ci;
        if (nzr*nzr*c + nzi*nzi > limit) {
            return float(i)/10.0;
        }
        zr = nzr;
        zi = nzi;
    }
    return 0.0;
}

void main(void)
{
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 uvD = (gl_FragCoord.xy + vec2(1.0)) / iResolution.xy;

    vec2 col2 = uv;
    uv.x *= iResolution.x / iResolution.y;
    uvD.x *= iResolution.x / iResolution.y;

    vec2 tra = vec2(-0.19, -0.34); //vec2(-0.8+sin(iGlobalTime)*0.5, -0.65+cos(iGlobalTime)*0.3);

    uv += vec2(-0.5, -0.5);
    uvD += vec2(-0.5, -0.5);

    vec2 ouv = uv;
    uvD -= uv;
    uvD *= 0.5;

    float r = length(uv);
    float a = sin(iGlobalTime * 0.134578) * 3.5 + sin(r);
    float s = cos(iGlobalTime * 0.17) * 1.99 + 2.0;

    float ca = cos(a);
    float sa = sin(a);

    mat2 sca = mat2(s, 0.0, 0.0, s);
    mat2 rot = mat2(ca, -sa, sa, ca);

    vec4 col = vec4(0.0);
    vec4 bg = vec4(1.0); //clamp(vec4(a, 0.5+a*0.1, 0.6-a, 1.0), vec4(0.0), vec4(1.0));

    col += mix(bg, vec4(col2,0.5+0.5*sin(iGlobalTime),1.0), mandelbrot((uv*rot)*sca-tra));
    uv = ouv + vec2(uvD.x, 0.0);
    col += mix(bg, vec4(col2,0.5+0.5*sin(iGlobalTime),1.0), mandelbrot((uv*rot)*sca-tra));
    uv = ouv + vec2(0.0, uvD.y);
    col += mix(bg, vec4(col2,0.5+0.5*sin(iGlobalTime),1.0), mandelbrot((uv*rot)*sca-tra));
    uv = ouv + uvD;
    col += mix(bg, vec4(col2,0.5+0.5*sin(iGlobalTime),1.0), mandelbrot((uv*rot)*sca-tra));

    gl_FragColor = pow(col * 0.25, vec4(1.5));
}
