// "global" variables
let gl, uTime, img
let imageLoaded = false

window.onload = function() {
    const canvas = document.getElementById( 'gl' )
    gl = canvas.getContext( 'webgl' )
    canvas.width = 300
    canvas.height = 300


    // create image
    img = document.createElement( 'img' )
    img.src = 'husky.png'

    // important for cross origin security
    img.crossOrigin = 'Anonymous'
    img.onload = makeTexture
    document.body.appendChild( img )

    // define drawing area of canvas. bottom corner, width / height
    gl.viewport( 0,0,gl.drawingBufferWidth, gl.drawingBufferHeight )

    // create a buffer object to store vertices
    const buffer = gl.createBuffer()

    // point buffer at graphic context's ARRAY_BUFFER
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer )

    const triangles = new Float32Array([
        -1, -1,
        1,  -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1
    ])

    // initialize memory for buffer and populate it. Give
    // open gl hint contents will not change dynamically.
    gl.bufferData( gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW )

    // create vertex shader
    let shaderScript = document.getElementById('vertex')
    let shaderSource = shaderScript.text
    const vertexShader = gl.createShader( gl.VERTEX_SHADER )
    gl.shaderSource( vertexShader, shaderSource );
    gl.compileShader( vertexShader )

    // create fragment shader
    shaderScript = document.getElementById('fragment')
    shaderSource = shaderScript.text
    const fragmentShader = gl.createShader( gl.FRAGMENT_SHADER )
    gl.shaderSource( fragmentShader, shaderSource )
    gl.compileShader( fragmentShader )
    console.log(gl.getShaderInfoLog(fragmentShader))

    // create shader program
    const program = gl.createProgram()
    gl.attachShader( program, vertexShader )
    gl.attachShader( program, fragmentShader )
    gl.linkProgram( program )
    gl.useProgram( program )

    /* ALL ATTRIBUTE/UNIFORM INITIALIZATION MUST COME AFTER
    CREATING/LINKING/USING THE SHADER PROGAM */

    // find a pointer to the uniform "time" in our fragment shader
    uTime = gl.getUniformLocation( program, 'time' )
    const uRes = gl.getUniformLocation( program, 'resolution' )
    gl.uniform2f( uRes, gl.drawingBufferWidth, gl.drawingBufferHeight )

    // get position attribute location in shader
    const position = gl.getAttribLocation( program, 'a_position' )
    // enable the attribute
    gl.enableVertexAttribArray( position )
    // this will point to the vertices in the last bound array buffer.
    // In this example, we only use one array buffer, where we're storing
    // our vertices
    gl.vertexAttribPointer( position, 2, gl.FLOAT, false, 0,0 )

    getVideo()
}

// keep track of time via incremental frame counter
let time = 0
function render() {
    // schedules render to be called the next time the video card requests
    // a frame of video
    window.requestAnimationFrame( render )

    // update time on CPU and GPU
    time++
    gl.uniform1f( uTime, time )

    // draw triangles using the array buffer from index 0 to 6 (6 is count)
    if(imageLoaded === true){
        gl.texImage2D(
            gl.TEXTURE_2D,    // target: you will always want gl.TEXTURE_2D
            0,                // level of detail: 0 is the base
            gl.RGBA, gl.RGBA, // color formats
            gl.UNSIGNED_BYTE, // type: the type of texture data; 0-255
            video               // pixel source: could also be video or image
        )
    }
    gl.drawArrays( gl.TRIANGLES, 0, 6 )
}

function getVideo() {
    video = document.createElement( 'video' )

    navigator.mediaDevices.getUserMedia({
        video:true
    }).then( stream => {
        video.srcObject = stream
        video.play()
        makeTexture()
    })

    return video
}

function makeTexture() {
    // create an OpenGL texture object
    const texture = gl.createTexture()

    // since canvas draws from the top and shaders draw from the bottom, we
    // have to flip our canvas when using it as a shader.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // this tells OpenGL which texture object to use for subsequent operations
    gl.bindTexture( gl.TEXTURE_2D, texture )



    // how to map when texture element is more than one pixel
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR )
    // how to map when texture element is less than one pixel
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE )

    imageLoaded = true;
    render()

}