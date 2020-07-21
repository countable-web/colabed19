// TODO: I probably shouldn't leave all the WebRTC logic here. Moving it to video-call.js makes more sense.

import { initSocket } from "./ws-manager.js";

const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
let peerConnection = null;
let roomDialog = null;
let roomId = null;
let gotSDPSignal = false;
let socketWrapper = null;
let busyFlag = false;
let isAuthenticated = false;

// SETUP FUNCTIONS

const peerConnectionConfig = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const constraints = (window.constraints = {
  audio: true,
  video: true,
});

// EVENT LISTENERS AND HANDLERS

const errorHandler = (error) => {
  // TODO: improve error handling.
  console.error(error);
};

const registerPeerConnectionListeners = () => {
  peerConnection.addEventListener("icegatheringstatechange", () => {
    console.log(
      `ICE gathering state change: ${peerConnection.iceGatheringState}`
    );
  });

  peerConnection.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${peerConnection.connectionState}`);
  });

  peerConnection.addEventListener("signalingstatechange", () => {
    console.log(`Signaling state change: ${peerConnection.signalingState}`);
  });

  peerConnection.addEventListener("iceconnectionstatechange ", () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
    if (peerConnection.iceConnectionState == "disconnected") {
      peerConnection.close();
      peerConnection = null;
      gotSDPSignal = false;
      busyFlag = false;
      remoteVideo.srcObject = null;
    }
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socketWrapper.socket.send(
        JSON.stringify({
          type: "new-ice-candidate",
          uuid: socketWrapper.uuid,
          candidate: event.candidate,
        })
      );
    }
  };

  peerConnection.ontrack = (event) => {
    if (event.streams) {
      let stream = event.streams[0];
      if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
        remoteVideo.srcObject = stream;
      }
    }
  };
};

const onSocketMessage = async (messageJSON) => {
  const message = JSON.parse(messageJSON.data);
  if (message.type) {
    if (message.type === "pong") {
      if (message.uuid !== socketWrapper.uuid) {
        console.log(message);
        if (
          localVideo.srcObject &&
          !gotSDPSignal &&
          !message.busy &&
          !isAuthenticated
        ) {
          sendOffer();
        }
      }
    } else {
      if (!peerConnection) {
        createPeerConnection();
        busyFlag = true;
      } 
      if (message.type === "new-ice-candidate") {
        console.log("Signal: new-ice-candidate");
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      } else if (message.type === "sdp-signal") {
        console.log("Signal: sdp-signal");
        if (!gotSDPSignal) {
          gotSDPSignal = true;
          try {
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(message.sdp)
            );
            if (message.sdp.type == "offer") {
              const answer = await peerConnection.createAnswer();
              try {
                createDescription(answer);
              } catch (error) {
                errorHandler(error);
              }
            }
          } catch (error) {
            errorHandler(error);
          }
        }
      }
    }
  }
};

// CONNECTION FUNCTIONS

const createDescription = async (description) => {
  await peerConnection.setLocalDescription(description);
  socketWrapper.socket.send(
    JSON.stringify({
      type: "sdp-signal",
      uuid: socketWrapper.uuid,
      sdp: peerConnection.localDescription,
    })
  );
};

const createPeerConnection = async () => {
  console.log(
    "Create PeerConnection with configuration: ",
    peerConnectionConfig
  );
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  registerPeerConnectionListeners();
  localVideo.srcObject.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localVideo.srcObject);
  });
};

const sendOffer = async () => {
  if (!peerConnection) {
    createPeerConnection();
    try {
      const offer = await peerConnection.createOffer();
      createDescription(offer);
    } catch (error) {
      errorHandler(error);
    }
  }
};

const startPing = (interval) => {
  setInterval(() => {
    if (socketWrapper.isOpen()) {
      socketWrapper.socket.send(
        JSON.stringify({
          type: "ping",
          uuid: socketWrapper.uuid,
          busy: busyFlag,
        })
      );
    }
  }, interval);
};

const getUserMediaSuccess = (stream, startPeerConnection) => {
  localVideo.srcObject = stream;
  if (startPeerConnection) {
    socketWrapper = initSocket(onSocketMessage);
    console.log(`isAuthenticated: ${isAuthenticated}`);
    if (isAuthenticated) {
      startPing(1000);
    }
  }
};

// EXPORTED FUNCTIONS

export const initLocalVideo = async (startPeerConnection) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    getUserMediaSuccess(stream, startPeerConnection);
  } catch (error) {
    errorHandler(error);
  }
};

export const authenticateUser = (authenticationResult) => {
  isAuthenticated = authenticationResult;
};
