void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec4 accum = texelFetch(iChannel1, ivec2(fragCoord), 0);
    vec4 lastLight = texelFetch(iChannel0, ivec2(fragCoord), 0);
    accum.rgb += lastLight.rgb;
    accum.a++;
    if (iMouse.z > 0.0) {
    	fragColor = vec4(0);
	} else {
	    fragColor = accum;
    }
}