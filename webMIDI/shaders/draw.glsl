precision mediump float;
uniform sampler2D state;
uniform vec2 scale;
uniform float red;
uniform float blue;
uniform float green;

void main() {
    vec4 color = texture2D(state, gl_FragCoord.xy / scale);
    gl_FragColor = vec4( red - color.x, green - color.x, blue - color.x, 1. );
}
