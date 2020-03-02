precision mediump float;

uniform sampler2D u_particles;
uniform sampler2D u_velocity;

uniform vec2 u_textureSize;
uniform vec2 u_screenSize;
uniform vec2 u_velocityTextureSize;

uniform float u_dt;

uniform float u_scale;

vec2 bilinearInterp(vec2 pos, sampler2D texture, vec2 size){
    //bilinear interp between nearest cells

    vec2 pxCenter = vec2(0.5, 0.5);

    vec2 ceiled = ceil(pos);
    vec2 floored = floor(pos);

    vec2 n = texture2D(texture, (ceiled+pxCenter)/size).xy;//actually ne
    vec2 s = texture2D(texture, (floored+pxCenter)/size).xy;//actually sw
    if (ceiled.x != floored.x){
        vec2 se = texture2D(texture, (vec2(ceiled.x, floored.y)+pxCenter)/size).xy;
        vec2 nw = texture2D(texture, (vec2(floored.x, ceiled.y)+pxCenter)/size).xy;
        n = n*(pos.x-floored.x) + nw*(ceiled.x-pos.x);
        s = se*(pos.x-floored.x) + s*(ceiled.x-pos.x);
    }
    vec2 materialVal = n;
    if (ceiled.y != floored.y){
        materialVal = n*(pos.y-floored.y) + s*(ceiled.y-pos.y);
    }
    return materialVal;
}

void main() {

    vec2 fragCoord = gl_FragCoord.xy;
    vec2 particleCoord = texture2D(u_particles, fragCoord/u_textureSize).xy;

    vec2 currentVelocity = 1.0/u_scale*bilinearInterp(vec2(1.0, 1.0) + particleCoord*u_scale/u_velocityTextureSize*(u_velocityTextureSize-vec2(0.5, 0.5)/u_scale), u_velocity, u_velocityTextureSize);
    vec2 nextPosition = particleCoord+currentVelocity*u_dt;//explicitly solve advection

    if (nextPosition.x < 0.0) nextPosition.x = 0.0;
    else if (nextPosition.x >= u_screenSize.x-3.0) nextPosition.x = u_screenSize.x-3.0;
    if (nextPosition.y < 0.0) nextPosition.y = 0.0;
    else if (nextPosition.y >= u_screenSize.y-3.0) nextPosition.y = u_screenSize.y-3.0;

    gl_FragColor = vec4(nextPosition, 0, 0);
}
    