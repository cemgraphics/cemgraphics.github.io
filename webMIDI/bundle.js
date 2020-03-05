(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const glslify = require('glslify')

let stateSize, pixelSize, feedSize, gl

window.onload = function() {

    let canvas = document.querySelector( 'canvas' )
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    gl = canvas.getContext( 'webgl' )
    stateSize = Math.pow( 2, Math.floor(Math.log(canvas.width)/Math.log(2)) )

    // turn on midi inputs
    enableMidi()

    let verts = [
        1, 1,
        -1, 1,
        -1,-1,
        1, 1,
        -1, -1,
        1, -1,
    ]

    let vertBuffer = gl.createBuffer()
    gl.bindBuffer( gl.ARRAY_BUFFER, vertBuffer )
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW )
    gl.vertexAttribPointer( 0, 2, gl.FLOAT, false, 0, 0 )
    gl.enableVertexAttribArray( 0 )

    //let shaderScript = document.getElementById( 'vshader' )
    let vertShaderSource = glslify(["precision mediump float;\n#define GLSLIFY 1\nattribute vec2 a_position;\nvoid main() {\n    gl_Position = vec4( a_position, 0, 1.0);\n}\n"])
    const vertexShader = gl.createShader( gl.VERTEX_SHADER )
    gl.shaderSource( vertexShader, vertShaderSource )
    gl.compileShader( vertexShader )
    console.log( gl.getShaderInfoLog( vertexShader ) ) // create fragment shader to run our simulation

    //shaderScript = document.getElementById( 'fshader_render' )
    let renderShaderSource = glslify(["precision mediump float;\n#define GLSLIFY 1\nuniform sampler2D state;\nuniform vec2 scale;\nuniform float f;\nuniform float k;\nuniform float dA;\nuniform float dB;\nuniform float time;\nuniform float frequency;\nuniform float displacement;\n\n//float f=.0545, k=.062, dA = 1., dB = 0.02; // coral preset\n//float f = .0457, k = .0635, dA = 1., dB = .5;\n\nvec2 get(int x, int y) {\n    return texture2D( state, ( gl_FragCoord.xy + vec2(x, y) ) / scale ).rg;\n}\n\nvec2 run() {\n\n    float new_k = k + (sin(time * frequency) / displacement);\n\n    vec2 state = get( 0, 0 );\n    float a = state.r;\n    float b = state.g;\n    float sumA = a * -1.;\n    float sumB = b * -1.;\n\n    sumA += get(-1,0).r * .2;\n    sumA += get(-1,-1).r * .05;\n    sumA += get(0,-1).r * .2;\n    sumA += get(1,-1).r * .05;\n    sumA += get(1,0).r * .2;\n    sumA += get(1,1).r * .05;\n    sumA += get(0,1).r * .2;\n    sumA += get(-1,1).r * .05;\n\n    sumB += get(-1,0).g * .2;\n    sumB += get(-1,-1).g * .05;\n    sumB += get(0,-1).g * .2;\n    sumB += get(1,-1).g * .05;\n    sumB += get(1,0).g * .2;\n    sumB += get(1,1).g * .05;\n    sumB += get(0,1).g * .2;\n    sumB += get(-1,1).g * .05;\n\n    state.r = a + dA\n    * sumA -\n    a * b * b +\n    f * (1. - a);\n\n    state.g = b + dB *\n    sumB +\n    a * b * b -\n    ((new_k+f) * b);\n\n    return state;\n}\nvoid main() {\n    vec2 nextState = run();\n    gl_FragColor = vec4( nextState.r, nextState.g, 0., 1. );\n}\n"])
    const fragmentShaderRender = gl.createShader( gl.FRAGMENT_SHADER )
    gl.shaderSource( fragmentShaderRender, renderShaderSource )
    gl.compileShader( fragmentShaderRender )
    console.log( gl.getShaderInfoLog( fragmentShaderRender ) ) // create shader program const

    programRender = gl.createProgram()
    gl.attachShader( programRender, vertexShader )
    gl.attachShader( programRender, fragmentShaderRender )
    gl.linkProgram( programRender )
    gl.useProgram( programRender )

    // create pointer to vertex array and uniform sharing simulation size
    const position = gl.getAttribLocation( programRender, 'a_position' )
    gl.enableVertexAttribArray( position )
    gl.vertexAttribPointer( position, 2, gl.FLOAT, false, 0,0 )
    let scale = gl.getUniformLocation( programRender, 'scale' )
    gl.uniform2f( scale, stateSize, stateSize )

    // create shader program to draw our simulation to the screen
    //shaderScript = document.getElementById( 'fshader_draw' )
    let drawShaderSource = glslify(["precision mediump float;\n#define GLSLIFY 1\nuniform sampler2D state;\nuniform vec2 scale;\nuniform float red;\nuniform float blue;\nuniform float green;\n\nvoid main() {\n    vec4 color = texture2D(state, gl_FragCoord.xy / scale);\n    gl_FragColor = vec4( red - color.x, green - color.x, blue - color.x, 1. );\n}\n"])
    fragmentShaderDraw = gl.createShader( gl.FRAGMENT_SHADER )
    gl.shaderSource( fragmentShaderDraw, drawShaderSource )
    gl.compileShader( fragmentShaderDraw )
    console.log( gl.getShaderInfoLog( fragmentShaderDraw ) )

    // create shader program
    programDraw = gl.createProgram()
    gl.attachShader( programDraw, vertexShader )
    gl.attachShader( programDraw, fragmentShaderDraw )
    gl.linkProgram( programDraw )
    gl.useProgram( programDraw )

    scale = gl.getUniformLocation( programDraw, 'scale' )
    gl.uniform2f( scale, canvas.width,canvas.height )
    const position2 = gl.getAttribLocation( programDraw, 'a_position' )
    gl.enableVertexAttribArray( position2 )
    gl.vertexAttribPointer( position2, 2, gl.FLOAT, false, 0,0 )

    // Dat.Gui
    let controls = function() {
        this.f = 0.0452;
        this.k = 0.0634;
        this.dA = 1.1;
        this.dB = 0.4;
        this.Red = 1.0;
        this.Green = 1.0;
        this.Blue = 1.0;
        this.frequency = 0.1;
        this.displacement = 100.;
        //this.explode = function() { ... };
        // Define render logic ...
    };



    controlValues = new controls();
    gui = new dat.GUI();
    gui.add(controlValues, 'Red', 0., 1.);
    gui.add(controlValues, 'Green', 0., 1.);
    gui.add(controlValues, 'Blue', 0., 1.);
    gui.add(controlValues, 'f', 0.01, 0.07);
    gui.add(controlValues, 'k', 0.04, 0.07);
    gui.add(controlValues, 'dA', 0.8, 1.1);
    gui.add(controlValues, 'dB', 0.2, 0.6);
    gui.add(controlValues, 'frequency', 0.01, 1.0);
    gui.add(controlValues, 'displacement', 0, 150);

    let redControl = gl.getUniformLocation( programDraw, "red" )
    let greenControl = gl.getUniformLocation( programDraw, "green" )
    let blueControl = gl.getUniformLocation( programDraw, "blue" )

    let fControl = gl.getUniformLocation( programRender, "f" )
    let kControl = gl.getUniformLocation( programRender, "k" )
    let dAControl = gl.getUniformLocation( programRender, "dA" )
    let dBControl = gl.getUniformLocation( programRender, "dB" )
    let timeControl = gl.getUniformLocation( programRender, 'time' )
    let frequencyControl = gl.getUniformLocation( programRender, 'frequency' )
    let displacementControl = gl.getUniformLocation( programRender, 'displacement' )


    gl.uniform1f( redControl, controlValues.Red )
    gl.uniform1f( greenControl, controlValues.Green )
    gl.uniform1f( blueControl, controlValues.Blue )


    // enable floating point textures in the browser
    gl.getExtension('OES_texture_float');

    let texFront = gl.createTexture()
    gl.bindTexture( gl.TEXTURE_2D, texFront )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST )
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, stateSize, stateSize, 0, gl.RGBA, gl.FLOAT, null )

    let texBack = gl.createTexture()
    gl.bindTexture( gl.TEXTURE_2D, texBack )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST )
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, stateSize, stateSize, 0, gl.RGBA, gl.FLOAT, null )

    // set sizes
    pixelSize = 4
    feedSize = 48


    reset(gl, stateSize, pixelSize, feedSize)

    const fb = gl.createFramebuffer()
    const fb2 = gl.createFramebuffer()

    const pingpong = function() {
        gl.bindFramebuffer( gl.FRAMEBUFFER, fb )
        // use the framebuffer to write to our texFront texture
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texFront, 0 )
        // set viewport to be the size of our state (reaction diffusion simulation)
        // here, this represents the size that will be drawn onto our texture
        gl.viewport(0, 0, stateSize, stateSize )
        // in our shaders, read from texBack, which is where we poked to
        gl.bindTexture( gl.TEXTURE_2D, texBack ) // run shader
        gl.drawArrays( gl.TRIANGLES, 0, 6 )

        gl.bindFramebuffer( gl.FRAMEBUFFER, fb2 )
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texBack, 0 )
        // set our viewport to be the size of our canvas
        // so that it will fill it entirely
        gl.viewport(0, 0, canvas.width, canvas.height )
        // select the texture we would like to draw the the screen.
        // note that webgl does not allow you to write to / read from the
        // same texture in a single render pass. Because of the swap, we're
        // displaying the state of our simulation ****before**** this render pass (frame)
        gl.bindTexture( gl.TEXTURE_2D, texFront )
        // put simulation on screen
        gl.drawArrays( gl.TRIANGLES, 0, 6 )
    }

    let time = 0;

    const draw = function() {
        gl.useProgram( programRender )

        time++;

        // set uniforms
        gl.uniform1f( fControl, controlValues.f )
        gl.uniform1f( kControl, controlValues.k )
        gl.uniform1f( dAControl, controlValues.dA )
        gl.uniform1f( dBControl, controlValues.dB )
        gl.uniform1f( frequencyControl, controlValues.frequency )
        gl.uniform1f( displacementControl, controlValues.displacement )
        gl.uniform1f( timeControl, time )


        for( let i = 0; i < 12; i++ ) pingpong()

        // use the default framebuffer object by passing null
        gl.bindFramebuffer( gl.FRAMEBUFFER, null )

        // set our viewport to be the size of our canvas
        // so that it will fill it entirely
        gl.viewport(0, 0, canvas.width, canvas.height )
        // select the texture we would like to draw the the screen.
        gl.bindTexture( gl.TEXTURE_2D, texBack )
        // use our drawing (copy) shader
        gl.useProgram( programDraw )

        // set uniforms
        gl.uniform1f( redControl, controlValues.Red )
        gl.uniform1f( greenControl, controlValues.Green )
        gl.uniform1f( blueControl, controlValues.Blue )

        // put simulation on screen
        gl.drawArrays( gl.TRIANGLES, 0, 6 )

        window.requestAnimationFrame( draw )
    }

    draw()
}

function enableMidi() {

    WebMidi.enable(function (err) {
        console.log(WebMidi.inputs);
        console.log(WebMidi.outputs);

        midiInput = WebMidi.getInputByName("Axiom A.I.R. Mini32 MIDI");

        /*
        let controls = function() {
            this.f = 0.0452;
            this.k = 0.0634;
            this.dA = 1.1;
            this.dB = 0.4;
            this.Red = 1.0;
            this.Green = 1.0;
            this.Blue = 1.0;
            this.frequency = 0.1;
            this.displacement = 100.;
            //this.explode = function() { ... };
            // Define render logic ...
        };

         */

        // Listen for a 'note on' message on all channels
        midiInput.addListener('noteon', "all",
            function (e) {
                console.log("Received 'noteon' message (" + e.note.number + "). Velocity " + e.velocity);

                let da = randomInRange(0.9, 1.2);
                let db = randomInRange(0.3, 0.5);

                controlValues.dA = da
                controlValues.dB = db

            }
        );

        midiInput.addListener('noteoff', "all",
            function (e) {
                console.log("Received 'noteoff' message (" + e.note.number + "). Velocity " + e.velocity);
            }
        );

        midiInput.addListener('controlchange', "all",
            function (e) {
                console.log("Received 'controlchange' message (" + e.controller.number + " Value: " + e.value);

                switch (e.controller.number) {

                    case 1:
                        controlValues.Red = 127 / e.value + 1
                        break
                    case 2:
                        controlValues.Green = 127 / e.value + 1
                        break
                    case 3:
                        controlValues.Blue = 127 / e.value + 1
                        break
                    case 4:
                        controlValues.displacement = e.value + 1
                        break
                    case 5:
                        controlValues.frequency = 127 / e.value + 1
                        break
                    default:
                        controlValues.frequency = 1.0
                }

            }
        );

    });
}

function randomInRange(min, max) {
    return Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);
}

function reset(gl, stateSize, pixelSize, feedSize) {
    let initState = new Float32Array( stateSize * stateSize * pixelSize )

    console.log("State " + stateSize)
    console.log("Pixel " + pixelSize)
    console.log("Feed " + feedSize)

    for( let i = 0; i < stateSize; i++ ) {
        for( let j = 0; j < stateSize * pixelSize; j+= pixelSize ) {
            // this will be our 'a' value in the simulation
            initState[ i * stateSize * pixelSize + j ] = 1
            // selectively add 'b' value to middle of screen
            if( i > stateSize / 2 - stateSize / feedSize  && i < stateSize / 2 + stateSize / feedSize ) {
                const xmin = j > (stateSize*pixelSize) / 2 - stateSize / feedSize
                const xmax = j < (stateSize*pixelSize) / 2 + (stateSize*pixelSize) / feedSize
                if( xmin && xmax ) {
                    initState[ i * stateSize * pixelSize + j + 1 ] = 1
                }
            }
        }
    }

    gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0, stateSize, stateSize, gl.RGBA, gl.FLOAT, initState, 0
    )
}
},{"glslify":2}],2:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}]},{},[1]);
