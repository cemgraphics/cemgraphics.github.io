const glslify = require("glslify");

/** @type {WebGLRenderingContext} */
let gl;

/** @type {WebGLFramebuffer} */
let framebuffer;
let frameBuffers = {};

/** @type {WebGLProgram} */
let simulationProgram;

/** @type {WebGLProgram} */
let addVectProgram, gradientProgram, divergenceProgram, forceProgram, addMaterialProgram,
    jacobiProgram, renderProgram, boundaryProgram, packToBytesProgram, moveParticleProgram;

/** @type {WebGLUniformLocation} */
let uTime;

/** @type {WebGLUniformLocation} */
let uSimulationState;

/** @type {WebGLTexture} */
let textureBack;
let textures = {};

/** @type {WebGLTexture} */
let textureFront;

/** @type {{width: number, height: number}} */
let dimensions = { width: null, height: null };

let width, height;
let actualWidth, actualHeight;
let body;
let canvas
let scale = 1;

let lastMouseCoordinates = [0, 0];
let mouseCoordinates =  [0,0];
let mouseEnable = false;
let mouseout = false;

let paused = false;//while window is resizing

let dt = 1;
let dx = 1;
let nu = 1;//viscosity
let rho = 1;//density


let numParticles = 160000;//perfect sq
let particlesTextureDim = 400;//sqrt(numParticles)
let particleData = new Float32Array(numParticles*4);//[position.x, position.y, velocity.x, velocity.y]
let particles;
let particlesVertices;
let vectorLength = 2;//num floats to parse

window.onload = function() {
  canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
    "gl"
  ));
  body = document.getElementsByTagName("body")[0];

  gl = /** @type {WebGLRenderingContext} */ (canvas.getContext("webgl"));
  canvas.width = dimensions.width = window.innerWidth;
  canvas.height = dimensions.height = window.innerHeight;

  window.onmousemove = onMouseMove;
  window.onmousedown = onMouseDown;
  window.onmouseup = onMouseUp;
  canvas.onmouseout = function (){
    mouseout = true;
  };
  canvas.onmouseenter = function (){
    mouseout = false;
  };

  window.onresize = onResize;

  // define drawing area of webgl canvas. bottom corner, width / height
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  let floatTextures = gl.getExtension('OES_texture_float');

  makeShaders();
  makeBuffer();
  makeTextures();

  resetWindow();
  newRender();
};

function makeBuffer() {
  // create a buffer object to store vertices
  const buffer = gl.createBuffer();

  // point buffer at graphic context's ARRAY_BUFFER
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  //const points = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
  particlesVertices = new Float32Array(numParticles*3);

  // get position attribute location in shader
  let position = gl.getAttribLocation(addVectProgram, "a_position");
  // enable the attribute
  gl.enableVertexAttribArray(position);

  // this will point to the vertices in the last bound array buffer. In this
  // example, we only use one array buffer, where we're storing our vertices
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

  // output frame buffer
  let outputTexture = makeSingleTexture(gl, particlesTextureDim * vectorLength, particlesTextureDim, "FLOAT", null);
  textures.output = outputTexture;
  frameBuffers.output = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.output);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);

  // initialize memory for buffer and populate it. Give
  // open gl hint contents will not change dynamically.
  gl.bufferData(gl.ARRAY_BUFFER, particlesVertices, gl.DYNAMIC_DRAW);
}

function makeShaders() {
  // create vertex shader
  const vertexSource = glslify.file("./shaders/vertex.glsl");
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSource);
  gl.compileShader(vertexShader);

  // create addVect fragment shader
  const addVectFragmentSource = glslify.file("./shaders/addVect.glsl");
  const addVectFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(addVectFragmentShader, addVectFragmentSource);
  gl.compileShader(addVectFragmentShader);
  console.log(gl.getShaderInfoLog(addVectFragmentShader));

  addVectProgram = gl.createProgram();
  gl.attachShader(addVectProgram, vertexShader);
  gl.attachShader(addVectProgram, addVectFragmentShader);

  gl.linkProgram(addVectProgram);
  gl.useProgram(addVectProgram);

  const UdtLocation = gl.getUniformLocation(addVectProgram, "u_dt");
  const UVelocityLocation = gl.getUniformLocation(addVectProgram, "u_velocity");
  const UMaterialLocation = gl.getUniformLocation(addVectProgram, "u_material");
  gl.uniform1f(UdtLocation, dt);
  gl.uniform1i(UVelocityLocation, 0);
  gl.uniform1i(UMaterialLocation, 1);


  // create gradient fragment shader
  const gradientFragmentSource = glslify.file("./shaders/gradient.glsl");
  const gradientFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(gradientFragmentShader, gradientFragmentSource);
  gl.compileShader(gradientFragmentShader);
  console.log(gl.getShaderInfoLog(gradientFragmentShader));

  gradientProgram = gl.createProgram();
  gl.attachShader(gradientProgram, vertexShader);
  gl.attachShader(gradientProgram, gradientFragmentShader);

  gl.linkProgram(gradientProgram);
  gl.useProgram(gradientProgram);

  const UConstLocation = gl.getUniformLocation(gradientProgram, "u_const");
  const UVelGradientLocation = gl.getUniformLocation(gradientProgram, "u_velocity");
  const UPressureLocation = gl.getUniformLocation(gradientProgram, "u_pressure");
  gl.uniform1f(UConstLocation, 0.5 / dx);
  gl.uniform1i(UVelGradientLocation, 0);
  gl.uniform1i(UPressureLocation, 1);

  // create divergence fragment shader
  const divergenceFragmentSource = glslify.file("./shaders/divergence.glsl");
  const divergenceFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(divergenceFragmentShader, divergenceFragmentSource);
  gl.compileShader(divergenceFragmentShader);
  console.log(gl.getShaderInfoLog(divergenceFragmentShader));

  divergenceProgram = gl.createProgram();
  gl.attachShader(divergenceProgram, vertexShader);
  gl.attachShader(divergenceProgram, divergenceFragmentShader);

  gl.linkProgram(divergenceProgram);
  gl.useProgram(divergenceProgram);

  const UConstDivergenceLocation = gl.getUniformLocation(divergenceProgram, "u_const");
  const UVelDivergenceLocation = gl.getUniformLocation(divergenceProgram, "u_velocity");
  gl.uniform1f(UConstDivergenceLocation, 0.5 / dx);
  gl.uniform1i(UVelDivergenceLocation, 0);

  // create force fragment shader
  const forceFragmentSource = glslify.file("./shaders/force.glsl");
  const forceFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(forceFragmentShader, forceFragmentSource);
  gl.compileShader(forceFragmentShader);
  console.log(gl.getShaderInfoLog(forceFragmentShader));

  forceProgram = gl.createProgram();
  gl.attachShader(forceProgram, vertexShader);
  gl.attachShader(forceProgram, forceFragmentShader);

  gl.linkProgram(forceProgram);
  gl.useProgram(forceProgram);

  const UDtLocation = gl.getUniformLocation(forceProgram, "u_dt");
  const UVelForceLocation = gl.getUniformLocation(forceProgram, "u_velocity");
  //const UMaterialForceLocation = gl.getUniformLocation(forceProgram, "u_material");
  gl.uniform1f(UDtLocation, dt);
  gl.uniform1i(UVelForceLocation, 0);
  //gl.uniform1i(UMaterialForceLocation, 0);

  // create addMaterial fragment shader
  const addMaterialFragmentSource = glslify.file("./shaders/addMaterial.glsl");
  const addMaterialFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(addMaterialFragmentShader, addMaterialFragmentSource);
  gl.compileShader(addMaterialFragmentShader);
  console.log(gl.getShaderInfoLog(addMaterialFragmentShader));

  addMaterialProgram = gl.createProgram();
  gl.attachShader(addMaterialProgram, vertexShader);
  gl.attachShader(addMaterialProgram, addMaterialFragmentShader);

  gl.linkProgram(addMaterialProgram);
  gl.useProgram(addMaterialProgram);

  // create jacobi fragment shader
  const jacobiFragmentSource = glslify.file("./shaders/jacobi.glsl");
  const jacobiFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(jacobiFragmentShader, jacobiFragmentSource);
  gl.compileShader(jacobiFragmentShader);
  console.log(gl.getShaderInfoLog(jacobiFragmentShader));

  jacobiProgram = gl.createProgram();
  gl.attachShader(jacobiProgram, vertexShader);
  gl.attachShader(jacobiProgram, jacobiFragmentShader);

  gl.linkProgram(jacobiProgram);
  gl.useProgram(jacobiProgram);

  const UBLocation = gl.getUniformLocation(forceProgram, "u_b");
  const UXLocation = gl.getUniformLocation(forceProgram, "u_x");
  gl.uniform1i(UBLocation, 0);
  gl.uniform1i(UXLocation, 1);

  // create render fragment shader
  const renderFragmentSource = glslify.file("./shaders/render.glsl");
  const renderFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(renderFragmentShader, renderFragmentSource);
  gl.compileShader(renderFragmentShader);
  console.log(gl.getShaderInfoLog(renderFragmentShader));

  // create render program that draws to screen
  renderProgram = gl.createProgram();
  gl.attachShader(renderProgram, vertexShader);
  gl.attachShader(renderProgram, renderFragmentShader);

  gl.linkProgram(renderProgram);
  gl.useProgram(renderProgram);

  const UMaterialRenderLocation = gl.getUniformLocation(renderProgram, "u_material");
  gl.uniform1i(UMaterialRenderLocation, 0);

  // create boundary fragment shader
  const boundaryFragmentSource = glslify.file("./shaders/boundary.glsl");
  const boundaryFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(boundaryFragmentShader, boundaryFragmentSource);
  gl.compileShader(boundaryFragmentShader);
  console.log(gl.getShaderInfoLog(boundaryFragmentShader));

  boundaryProgram = gl.createProgram();
  gl.attachShader(boundaryProgram, vertexShader);
  gl.attachShader(boundaryProgram, boundaryFragmentShader);

  gl.linkProgram(boundaryProgram);
  gl.useProgram(boundaryProgram);

  const UTextureBoundaryLocation = gl.getUniformLocation(boundaryProgram, "u_texture");
  gl.uniform1i(UTextureBoundaryLocation, 0);

  // create packToBytes fragment shader
  const packToByteFragmentSource = glslify.file("./shaders/packToByte.glsl");
  const packToByteFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(packToByteFragmentShader, packToByteFragmentSource);
  gl.compileShader(packToByteFragmentShader);
  console.log(gl.getShaderInfoLog(packToByteFragmentShader));

  packToBytesProgram = gl.createProgram();
  gl.attachShader(packToBytesProgram, vertexShader);
  gl.attachShader(packToBytesProgram, packToByteFragmentShader);

  gl.linkProgram(packToBytesProgram);
  gl.useProgram(packToBytesProgram);

  const UFloatTextureDimLocation = gl.getUniformLocation(packToBytesProgram, "u_floatTextureDim");
  gl.uniform2f(UFloatTextureDimLocation, particlesTextureDim, particlesTextureDim);

  // create moveParticles fragment shader
  const moveParticleSource = glslify.file("./shaders/moveParticle.glsl");
  const moveParticleFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(moveParticleFragmentShader, moveParticleSource);
  gl.compileShader(moveParticleFragmentShader);
  console.log(gl.getShaderInfoLog(moveParticleFragmentShader));

  // create moveParticle program
  moveParticleProgram = gl.createProgram();
  gl.attachShader(moveParticleProgram, vertexShader);
  gl.attachShader(moveParticleProgram, moveParticleFragmentShader);

  gl.linkProgram(moveParticleProgram);
  gl.useProgram(moveParticleProgram);

  const UParticlesLocation = gl.getUniformLocation(moveParticleProgram, "u_particles");
  const UVelocityParticleLocation = gl.getUniformLocation(moveParticleProgram, "u_velocity");
  const UTextureSizeLocation = gl.getUniformLocation(moveParticleProgram, "u_textureSize");
  const UDtParticleLocation = gl.getUniformLocation(moveParticleProgram, "u_dt");

  gl.uniform1i(UParticlesLocation, 0);
  gl.uniform1i(UVelocityParticleLocation, 1);
  gl.uniform2f(UTextureSizeLocation, particlesTextureDim, particlesTextureDim);
  gl.uniform1f(UDtParticleLocation, 0.5);


}

function makeSingleTexture(gl, width, height, typeName, data){

  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, data);

  return texture;
}

function makeTextures() {

  textureBack = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureBack);

  // these two lines are needed for non-power-of-2 textures
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // how to map when texture element is less than one pixel
  // use gl.NEAREST to avoid linear interpolation
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  // how to map when texture element is more than one pixel
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // specify texture format, see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    dimensions.width,
    dimensions.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  textureFront = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureFront);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    dimensions.width,
    dimensions.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );

  // Create a framebuffer and attach the texture.
  framebuffer = gl.createFramebuffer();

  // textures loaded, now ready to render
  //render();
}

function newRender(){
  if(!paused) {
    gl.viewport(0, 0, dimensions.width, dimensions.height);

    // advect program
    gl.useProgram(addVectProgram);
    const UTextureSizeAddVectLoc = gl.getUniformLocation(addVectProgram, "u_textureSize");
    const UVelocityAddVectLoc = gl.getUniformLocation(addVectProgram, "u_velocity");
    gl.uniform2f(UTextureSizeAddVectLoc, width, height);
    gl.uniform1f(UVelocityAddVectLoc, 1.0);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextVelocity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // boundary program
    gl.useProgram(boundaryProgram);
    const UScaleBoundaryLoc = gl.getUniformLocation(boundaryProgram, "u_scale");
    gl.uniform1f(UScaleBoundaryLoc, -1);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.nextVelocity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


    // diffuse velocity
    // jacobi program
    gl.useProgram(jacobiProgram);
    let alpha = dx*dx/(nu*dt);
    const UAlphaJacobiLoc = gl.getUniformLocation(jacobiProgram, "u_alpha");
    const UReciprocalBetaJacobiLoc = gl.getUniformLocation(jacobiProgram, "u_alpha");
    gl.uniform1f(UAlphaJacobiLoc, alpha);
    gl.uniform1f(UReciprocalBetaJacobiLoc, 1.0/(4.0+alpha));

    for(let i = 0; i<1; i++){
      // step
      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextVelocity);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.velocity);

      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocity);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.nextVelocity);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.nextVelocity);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    //apply force
    gl.useProgram(forceProgram);
    if (!mouseout && mouseEnable){
      const UMouseEnableLoc = gl.getUniformLocation(forceProgram, "u_mouseEnable");
      const UMouseCoordLoc = gl.getUniformLocation(forceProgram, "u_mouseCoord");
      const UMouseDirLoc = gl.getUniformLocation(forceProgram, "u_mouseDir");

      gl.uniform1f(UMouseEnableLoc, 1.0);
      gl.uniform2f(UMouseCoordLoc, mouseCoordinates[0]*scale, mouseCoordinates[1]*scale);
      gl.uniform2f(UMouseDirLoc, 3*(mouseCoordinates[0]-lastMouseCoordinates[0])*scale, 3*(mouseCoordinates[1]-lastMouseCoordinates[1])*scale);

    } else {

      const UMouseEnableLoc = gl.getUniformLocation(forceProgram, "u_mouseEnable");
      gl.uniform1f(UMouseEnableLoc, 0.0);
    }

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextVelocity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // boundary program
    gl.useProgram(boundaryProgram);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.nextVelocity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // divergence program
    gl.useProgram(divergenceProgram);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocityDivergence);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // compute pressure
    gl.useProgram(jacobiProgram);

    gl.uniform1f(UAlphaJacobiLoc, -dx*dx);
    gl.uniform1f(UReciprocalBetaJacobiLoc, 1.0 / 4.0);

    for (let i=0;i<10;i++) {

      // step
      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextPressure);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.velocityDivergence);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.pressure);

      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.pressure);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures.velocityDivergence);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textures.nextPressure);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // boundary program
    gl.useProgram(boundaryProgram);

    gl.uniform1f(UScaleBoundaryLoc, 1.0);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextPressure);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.pressure);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Swap textures
    let tmp = textures.pressure;
    textures.pressure = textures.nextPressure;
    textures.nextPressure = tmp;

    let tmpFrame = frameBuffers.pressure;
    frameBuffers.pressure = frameBuffers.nextPressure;
    frameBuffers.nextPressure = tmpFrame;

    // subtract pressure gradient
    // gradient program
    gl.useProgram(gradientProgram);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextVelocity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.pressure);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // boundary program
    gl.useProgram(boundaryProgram);

    gl.uniform1f(UScaleBoundaryLoc, -1.0);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.nextVelocity);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // move material
    gl.viewport(0, 0, actualWidth, actualHeight);


    //add material
    gl.useProgram(addMaterialProgram);
    if (!mouseout && mouseEnable){
      const UMouseEnableMaterialLoc = gl.getUniformLocation(addMaterialProgram, "u_mouseEnable");
      const UMouseCoordMaterialLoc = gl.getUniformLocation(addMaterialProgram, "u_mouseCoord");
      const UMouseLengthMaterialLoc = gl.getUniformLocation(addMaterialProgram, "u_mouseLength");

      gl.uniform1f(UMouseEnableMaterialLoc, 1.0);
      gl.uniform2f(UMouseCoordMaterialLoc, mouseCoordinates[0], mouseCoordinates[1]);
      gl.uniform1f(UMouseLengthMaterialLoc, Math.sqrt(Math.pow(3*(mouseCoordinates[0]-lastMouseCoordinates[0]),2)
          +Math.pow(3*(mouseCoordinates[1]-lastMouseCoordinates[1]),2)));

    } else {

      const UMouseEnableMaterialLoc = gl.getUniformLocation(jacobiProgram, "u_mouseEnable");
      gl.uniform1f(UMouseEnableMaterialLoc, 0.0);
    }

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.newMaterial);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.material);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // addVect program
    gl.useProgram(addVectProgram);

    const UScaleAddVectLoc = gl.getUniformLocation(addVectProgram, "u_scale");
    gl.uniform2f(UTextureSizeAddVectLoc, actualWidth, actualHeight);
    gl.uniform1f(UScaleAddVectLoc, scale);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.material);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.newMaterial);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // render program
    gl.useProgram(renderProgram);

    // step
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.output);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.material);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    //GPU.step("render", ["material"]);

  } else resetWindow();

  //move particles
  //http://voxelent.com/html/beginners-guide/chapter_10/ch10_PointSprites.html
  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  //http://stackoverflow.com/questions/5497722/how-can-i-animate-an-object-in-webgl-modify-specific-vertices-not-full-transfor

  gl.viewport(0, 0, particlesTextureDim, particlesTextureDim);

  // move particles
  gl.useProgram(moveParticleProgram);
  // step
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.newParticles);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.particles);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // step
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.particles);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.newParticles);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textures.velocity);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.viewport(0, 0, particlesTextureDim*vectorLength, particlesTextureDim);

  gl.useProgram(packToBytesProgram);

  const UVectorLengthLoc = gl.getUniformLocation(packToBytesProgram, "u_vectorLength");
  gl.uniform1f(UVectorLengthLoc, vectorLength);

  // step
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.output);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.particles);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


  let pixels = new Uint8Array(numParticles*4*vectorLength);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
    gl.readPixels(0, 0, particlesTextureDim * vectorLength, particlesTextureDim, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let parsedPixels = new Float32Array(pixels.length);
    for (var i=0;i<numParticles;i++){
      particlesVertices[3*i] = parsedPixels[vectorLength*i];
      particlesVertices[3*i+1] = parsedPixels[vectorLength*i+1];
    }
    //particles.geometry.attributes.position.needsUpdate = true;
  }

  window.requestAnimationFrame(newRender);
}

function resetWindow(){

  actualWidth = Math.round(body.clientWidth);
  actualHeight = Math.round(body.clientHeight);

  var maxDim = Math.max(actualHeight, actualWidth);
  var _scale = Math.ceil(maxDim/150);
  if (_scale < 1) _scale = 1;

  width = Math.floor(actualWidth/_scale);
  height = Math.floor(actualHeight/_scale);

  scale = 1/_scale;

  canvas.width = actualWidth;
  canvas.height = actualHeight;
  canvas.clientWidth = body.clientWidth;
  canvas.clientHeight = body.clientHeight;

  // GPU.setSize(width, height);

  gl.useProgram(gradientProgram);
  const UTextureSizeGradientLocation = gl.getUniformLocation(gradientProgram, "u_textureSize");
  gl.uniform2f(UTextureSizeGradientLocation, width, height);

  gl.useProgram(divergenceProgram);
  const UTextureSizeDivergenceLocation = gl.getUniformLocation(divergenceProgram, "u_textureSize");
  gl.uniform2f(UTextureSizeDivergenceLocation, width, height);

  gl.useProgram(forceProgram);
  const UReciprocalRadiusForceLocation = gl.getUniformLocation(forceProgram, "u_reciprocalRadius");
  const UTextureSizeForceLocation = gl.getUniformLocation(forceProgram, "u_textureSize");
  gl.uniform1f(UReciprocalRadiusForceLocation, 0.03/scale);
  gl.uniform2f(UTextureSizeForceLocation, width, height);

  gl.useProgram(addMaterialProgram);
  const UReciprocalRadiusMaterialLocation = gl.getUniformLocation(addMaterialProgram, "u_reciprocalRadius");
  const UTextureSizeMaterialLocation = gl.getUniformLocation(addMaterialProgram, "u_textureSize");
  gl.uniform1f(UReciprocalRadiusMaterialLocation, 0.03);
  gl.uniform2f(UTextureSizeMaterialLocation, actualWidth, actualHeight);

  gl.useProgram(jacobiProgram);
  const UTextureSizeJacobiLocation = gl.getUniformLocation(jacobiProgram, "u_textureSize");
  gl.uniform2f(UTextureSizeJacobiLocation, width, height);

  gl.useProgram(renderProgram);
  const UTextureSizeRenderLocation = gl.getUniformLocation(renderProgram, "u_textureSize");
  gl.uniform2f(UTextureSizeRenderLocation, actualWidth, actualHeight);

  gl.useProgram(boundaryProgram);
  const UTextureSizeBoundaryLocation = gl.getUniformLocation(boundaryProgram, "u_textureSize");
  gl.uniform2f(UTextureSizeBoundaryLocation, width, height);

  gl.useProgram(moveParticleProgram);
  const UTextureSizeParticleLocation = gl.getUniformLocation(moveParticleProgram, "u_velocityTextureSize");
  const UScreenSizeParticleLocation = gl.getUniformLocation(moveParticleProgram, "u_screenSize");
  const UScaleParticleLocation = gl.getUniformLocation(moveParticleProgram, "u_scale");
  gl.uniform2f(UTextureSizeParticleLocation, width, height);
  gl.uniform2f(UScreenSizeParticleLocation, actualWidth, actualHeight);
  gl.uniform1f(UScaleParticleLocation, scale);


  // setup frame buffers for textures
  let velocity = new Float32Array(width*height*4);

  let velocityTexture = makeSingleTexture(gl, width, height, "FLOAT", velocity);
  textures.velocity = velocityTexture;
  frameBuffers.velocity = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocity);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, velocityTexture, 0);

  let nextVelocityTexture = makeSingleTexture(gl, width, height, "FLOAT", new Float32Array(width*height*4));
  textures.nextVelocity = nextVelocityTexture;
  frameBuffers.nextVelocity = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextVelocity);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextVelocityTexture, 0);

  let velocityDivergenceTexture = makeSingleTexture(gl, width, height, "FLOAT", new Float32Array(width*height*4));
  textures.velocityDivergence = velocityDivergenceTexture;
  frameBuffers.velocityDivergence = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.velocityDivergence);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, velocityDivergenceTexture, 0);

  let pressureTexture = makeSingleTexture(gl, width, height, "FLOAT", new Float32Array(width*height*4));
  textures.pressure = pressureTexture;
  frameBuffers.pressure = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.pressure);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pressureTexture, 0);

  let nextPressureTexture = makeSingleTexture(gl, width, height, "FLOAT", new Float32Array(width*height*4));
  textures.nextPressure = nextPressureTexture;
  frameBuffers.nextPressure = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.nextPressure);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextPressureTexture, 0);


  var material = new Float32Array(actualWidth*actualHeight*4);

  let materialTexture = makeSingleTexture(gl, actualWidth, actualHeight, "FLOAT", material);
  textures.material = materialTexture;
  frameBuffers.material = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.material);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, materialTexture, 0);

  let newMaterialTexture = makeSingleTexture(gl, actualWidth, actualHeight, "FLOAT", material);
  textures.newMaterial = newMaterialTexture;
  frameBuffers.newMaterial = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.newMaterial);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, newMaterialTexture, 0);

  setInitialState();
  // resume render
  paused = false;
}

function setInitialState() {
  for (var i=0;i<numParticles;i++){
    let vertex = new Vec3(Math.random()*actualWidth, Math.random()*actualHeight, 0);
    particleData[i*4] = vertex.x;
    particleData[i*4+1] = vertex.y;
    particlesVertices[3*i] = vertex.x;
    particlesVertices[3*i+1] = vertex.y;
  }

  let particlesTexture = makeSingleTexture(gl, particlesTextureDim, particlesTextureDim, "FLOAT", particleData);
  textures.particles = particlesTexture;
  frameBuffers.particles = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.newMaterial);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, particlesTexture, 0);

  let nextParticlesTexture = makeSingleTexture(gl, particlesTextureDim, particlesTextureDim, "FLOAT", particleData);
  textures.newParticles = nextParticlesTexture;
  frameBuffers.newParticles = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.newParticles);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextParticlesTexture, 0);

}

function onMouseMove(e){
  lastMouseCoordinates = mouseCoordinates;
  let x = e.clientX;
  let padding = 10;
  if (x<padding) x = padding;
  if (x>dimensions.width-padding) x = dimensions.width-padding;
  let y = e.clientY;
  if (y<padding) y = padding;
  if (y>dimensions.height-padding) y = dimensions.height-padding;
  mouseCoordinates = [x, dimensions.height-y];
}

function onMouseDown(){
  mouseEnable = true;
}

function onMouseUp(){
  mouseEnable = false;
}
function Vec3(x, y, z) {
  this.x = x != null ? x : 0;
  this.y = y != null ? y : 0;
  this.z = z != null ? z : 0;
}
function onResize(){
  paused = true;
}

