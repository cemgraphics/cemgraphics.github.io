precision mediump float;

uniform sampler2D u_velocity;
uniform sampler2D u_material;

uniform vec2 u_textureSize;
uniform float u_scale;

uniform float u_dt;

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

    vec2 pxCenter = vec2(0.5, 0.5);

    vec2 currentVelocity;
    if (u_scale == 1.0) currentVelocity = 1.0/u_scale*texture2D(u_velocity, fragCoord/u_textureSize).xy;
    else {
        vec2 scaledCoord = (fragCoord-pxCenter)*u_scale;
        vec2 scaledSize = u_textureSize*u_scale;
        currentVelocity = 1.0/u_scale*bilinearInterp(vec2(1.0, 1.0) + scaledCoord/scaledSize*(scaledSize-vec2(0.5, 0.5)/u_scale), u_velocity, scaledSize);
    }

    //implicitly solve advection

    if (length(currentVelocity) == 0.0) {//no velocity
        gl_FragColor = vec4(texture2D(u_material, fragCoord/u_textureSize).xy, 0, 0);
        return;
    }

    vec2 pos = fragCoord - pxCenter - u_dt*currentVelocity;

    vec2 materialVal;
    //empty boundary
    if (pos.x < 0.0 || pos.x >= u_textureSize.x-1.0 || pos.y < 0.0 || pos.y >= u_textureSize.y-1.0) materialVal = vec2(0.0);
    else materialVal = bilinearInterp(pos, u_material, u_textureSize);

    gl_FragColor = vec4(materialVal, 0, 0);
}
    