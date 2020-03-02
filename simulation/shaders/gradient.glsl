precision mediump float;

uniform sampler2D u_velocity;
uniform sampler2D u_pressure;

uniform vec2 u_textureSize;

uniform float u_const;

void main() {

    vec2 fragCoord = gl_FragCoord.xy;

    vec2 currentVelocity = texture2D(u_velocity, fragCoord/u_textureSize).xy;

    float n = texture2D(u_pressure, (fragCoord+vec2(0.0, 1.0))/u_textureSize).x;
    float s = texture2D(u_pressure, (fragCoord+vec2(0.0, -1.0))/u_textureSize).x;
    float e = texture2D(u_pressure, (fragCoord+vec2(1.0, 0.0))/u_textureSize).x;
    float w = texture2D(u_pressure, (fragCoord+vec2(-1.0, 0.0))/u_textureSize).x;

    gl_FragColor = vec4(currentVelocity-u_const*vec2(e-w, n-s), 0, 0);
}

