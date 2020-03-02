precision mediump float;

uniform sampler2D u_material;
uniform vec2 u_textureSize;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;

  vec3 background = vec3(0.27, 0.91, 0.22);
  vec3 material1 = vec3(0.925, 0, 0.55);
  vec3 material2 = vec3(0.0, 0.70, 0.63);
  vec3 material3 = vec3(0.52, 0.81, 0.70);
  vec3 material4 = vec3(1.0, 0.7, 0.07);

  float val = texture2D(u_material, fragCoord/u_textureSize).x/2.0;
  if (val > 1.0) val = 1.0;
  if (val < 0.0) val = 0.0;

  float numColors = 3.0;

  vec3 color = vec3(0.0);
  if (val <= 1.0/numColors) {
    val *= numColors;
    color = background*(1.0-val) + material1*val;
  } else if (val <= 2.0/numColors) {
    val -= 1.0/numColors;
    val *= numColors;
    color = material1*(1.0-val) + material2*val;
  } else if (val <= 3.0/numColors) {
    val -= 2.0/numColors;
    val *= numColors;
    color = material2*(1.0-val) + material3*val;
  } else {
    val -= 3.0/numColors;
    val *= numColors;
    color = material3*(1.0-val) + material4*val;
  }

  gl_FragColor = vec4(color, 1);
}
    