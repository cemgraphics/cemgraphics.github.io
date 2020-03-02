precision mediump float;

uniform sampler2D u_material;

uniform vec2 u_textureSize;

uniform vec2 u_mouseCoord;
uniform float u_mouseLength;
uniform float u_mouseEnable;

uniform float u_reciprocalRadius;

void main() {

    vec2 fragCoord = gl_FragCoord.xy;

    float currentMaterial = texture2D(u_material, fragCoord/u_textureSize).x;

    if (u_mouseEnable == 1.0){
        vec2 pxDist = fragCoord - u_mouseCoord;
        currentMaterial += u_mouseLength*0.1*exp(-(pxDist.x*pxDist.x+pxDist.y*pxDist.y)*u_reciprocalRadius);
    }

    if (currentMaterial > 0.0) currentMaterial -= 0.002;//material disappears over time
    gl_FragColor = vec4(currentMaterial, 0, 0, 0);
}

