precision mediump float;

uniform sampler2D u_velocity;

uniform vec2 u_textureSize;

uniform float u_const;

void main() {

    vec2 fragCoord = gl_FragCoord.xy;

    //finite difference formulation of divergence

    float n = texture2D(u_velocity, (fragCoord+vec2(0.0, 1.0))/u_textureSize).y;
    float s = texture2D(u_velocity, (fragCoord+vec2(0.0, -1.0))/u_textureSize).y;
    float e = texture2D(u_velocity, (fragCoord+vec2(1.0, 0.0))/u_textureSize).x;
    float w = texture2D(u_velocity, (fragCoord+vec2(-1.0, 0.0))/u_textureSize).x;

    float div = u_const*(e-w + n-s);
    gl_FragColor = vec4(div, 0, 0, 0);
}
    