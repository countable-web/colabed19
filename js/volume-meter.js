/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*

Usage:
audioNode = createAudioMeter(audioContext,clipLevel,averaging,clipLag);

audioContext: the AudioContext you're using.
clipLevel: the level (0 to 1) that you would consider "clipping".
   Defaults to 0.98.
averaging: how "smoothed" you would like the meter to be over time.
   Should be between 0 and less than 1.  Defaults to 0.95.
clipLag: how long you would like the "clipping" indicator to show
   after clipping has occured, in milliseconds.  Defaults to 750ms.

Access the clipping through node.checkClipping(); use node.shutdown to get rid of it.
*/

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
  var processor = audioContext.createScriptProcessor(512)
  processor.onaudioprocess = volumeAudioProcess
  processor.clipping = false
  processor.lastClip = 0
  processor.volume = 0
  processor.clipLevel = clipLevel || 0.98
  processor.averaging = averaging || 0.95
  processor.clipLag = clipLag || 750

  // this will have no effect, since we don't copy the input to the output,
  // but works around a current Chrome bug.
  processor.connect(audioContext.destination)

  processor.checkClipping = function() {
    if (!this.clipping) return false
    if (this.lastClip + this.clipLag < window.performance.now())
      this.clipping = false
    return this.clipping
  }

  processor.shutdown = function() {
    this.disconnect()
    this.onaudioprocess = null
  }

  return processor
}

function volumeAudioProcess(event) {
  var buf = event.inputBuffer.getChannelData(0)
  var bufLength = buf.length
  var sum = 0
  var x

  // Do a root-mean-square on the samples: sum up the squares...
  for (var i = 0; i < bufLength; i++) {
    x = buf[i]
    if (Math.abs(x) >= this.clipLevel) {
      this.clipping = true
      this.lastClip = window.performance.now()
    }
    sum += x * x
  }

  // ... then take the square root of the sum.
  var rms = Math.sqrt(sum / bufLength)

  // Now smooth this out with the averaging factor applied
  // to the previous sample - take the max here because we
  // want "fast attack, slow release."
  this.volume = Math.max(rms, this.volume * this.averaging)
}

/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var audioContext = null
var meter = null
var canvasContext = null
var WIDTH = 500
var HEIGHT = 50
var rafID = null

volume_test = function() {
  document.getElementById('volume_bad').style.display = 'block'
  document.getElementById('volume_test_button').style.display = 'none'

  // grab our canvas
  canvasContext = document.getElementById('meter').getContext('2d')

  // monkeypatch Web Audio
  window.AudioContext = window.AudioContext || window.webkitAudioContext

  // grab an audio context
  audioContext = new AudioContext()
 
  //NOTE (Gian): This is the old implementation, using the deprecated Navigator.getUserMedia (https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getUserMedia). I'm choosing to leave this here in case we find any problems with the new implementation (using the newer MediaDevices.getUserMedia). The newer solution is supposed to be more reliable, and I didn't find any problems with it while testing the feature, but I can't really predict its behaviour on every device running the application. This is a safety net for unpredictable edge cases as much as it is a guide to future debugging and/or rafactoring of this feature.

  // Attempt to get audio input
  // try {
  //     // monkeypatch getUserMedia
  //     navigator.getUserMedia =
  //     	navigator.getUserMedia ||
  //     	navigator.webkitGetUserMedia ||
  //     	navigator.mozGetUserMedia;

  //     // ask for an audio input
  //     navigator.getUserMedia(
  //     {
  //         "audio": {
  //             "mandatory": {
  //                 "googEchoCancellation": "false",
  //                 "googAutoGainControl": "false",
  //                 "googNoiseSuppression": "false",
  //                 "googHighpassFilter": "false"
  //             },
  //             "optional": []
  //         },
  //     }, gotStream, didntGetStream);
  // } catch (e) {
  //     alert('getUserMedia threw exception :' + e);
  // }

  const constraints = {
    audio: true
  }

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(gotStream)
      .catch(didntGetStream)
  } else {
    alert(
      'Your browser does not support audio/video streams, please try another browser or device.'
    )
  }
}

const didntGetStream = () => {
  alert('Stream generation failed.')
}

let mediaStreamSource = null

const gotStream = stream => {
  // Create an AudioNode from the stream.
  mediaStreamSource = audioContext.createMediaStreamSource(stream)

  // Create a new volume meter and connect it.
  meter = createAudioMeter(audioContext)
  mediaStreamSource.connect(meter)

  // kick off the visual updating
  drawLoop()
}

function drawLoop(time) {
  // clear the background
  canvasContext.clearRect(0, 0, WIDTH, HEIGHT)

  // check if we're currently clipping
  if (meter.checkClipping()) canvasContext.fillStyle = 'red'
  else canvasContext.fillStyle = 'green'

  // draw a bar based on the current volume
  canvasContext.fillRect(0, 0, meter.volume * WIDTH * 1.4, HEIGHT)
  if (meter.volume > 0.05) {
    document.getElementById('volume_good').style.display = 'block'
    document.getElementById('volume_bad').style.display = 'none'
  }
  rafID = window.requestAnimationFrame(drawLoop)
  // set up the next visual callback
}