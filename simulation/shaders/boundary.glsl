precision mediump float;

uniform sampler2D u_texture;
uniform float u_scale;
uniform vec2 u_textureSize;

void main() {
    vec2 fragCoord = gl_FragCoord.xy;

    if (fragCoord.x < 1.0){
        gl_FragColor = u_scale*texture2D(u_texture, (fragCoord + vec2(1.0, 0.0))/u_textureSize);
        return;
    } else if (fragCoord.x >= u_textureSize.x-1.0){
        gl_FragColor = u_scale*texture2D(u_texture, (fragCoord + vec2(-1.0, 0.0))/u_textureSize);
        return;
    } else if (fragCoord.y < 1.0){
        gl_FragColor = u_scale*texture2D(u_texture, (fragCoord + vec2(0.0, 1.0))/u_textureSize);
        return;
    } else if (fragCoord.y >= u_textureSize.y-1.0){
        gl_FragColor = u_scale*texture2D(u_texture, (fragCoord + vec2(0.0, -1.0))/u_textureSize);
        return;
    }

    gl_FragColor = texture2D(u_texture, (fragCoord)/u_textureSize);
}

