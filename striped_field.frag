precision highp float;
precision lowp int;

uniform vec3      iResolution;
uniform float     iGlobalTime;
uniform vec4      iMouse;
uniform sampler2D iChannel0;
uniform float iRot;
uniform float iRot2;
uniform float iOpen;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    uv = (-1.0 + 2.0 * uv) * vec2(iResolution.x / iResolution.y, 1.0);

    vec2 p0 = 0.6*vec2(sin(iGlobalTime), cos(iGlobalTime*1.2));
    vec2 p1 = 0.6*vec2(-sin(iGlobalTime*0.9), -cos(iGlobalTime));
    
    vec2 v0 = uv - p0;
    vec2 v1 = uv - p1;
    v0 *= 1.0 / pow(length(v0), 2.0);
    v1 *= 1.0 / pow(length(v1), 2.0);
    vec2 v = v0 - v1;

    if (length(uv-p0) < 0.05) {
        fragColor = vec4(1.0);
    } else if (length(uv-p1) < 0.05) {
        fragColor = vec4(1.0);
    } else if (mod(floor(atan(v.y*v.x)*2.0*3.14159), 2.0) == 0.0) {
        fragColor = 0.8 * vec4(abs(v.y)/3.0, abs(v.x)/3.0, length(v)/7.0,1.0);
    } else {
        fragColor = vec4(abs(v.y)/3.0, abs(v.x)/3.0, length(v)/7.0,1.0);
    }
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}