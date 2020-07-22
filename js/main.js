// TODO: I probably shouldn't leave all the WebRTC logic here. Moving it to video-call.js makes more sense.
// TODO: Remove direct DOM manipulations (eventually I'll have to choose a library or framework to upgrade the interface).

import { initSocket } from "./ws-manager.js";

const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const notificationBlacklist = {};
let peerConnection = null;
let socketWrapper = null;
let gotSDPSignal = false;
let busyFlag = false;
let isAuthenticated = false;

// SETUP FUNCTIONS

// TODO: update connection configuration (add a TURN server).
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
  peerConnection.onicegatheringstatechange = () => {
    if (peerConnection && peerConnection.iceGatheringState) {
      console.log(
        `ICE gathering state change: ${peerConnection.iceGatheringState}`
      );
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection && peerConnection.connectionState) {
      console.log(`Connection state change: ${peerConnection.connectionState}`);
    }
  };

  peerConnection.onsignalingstatechange = () => {
    if (peerConnection && peerConnection.signalingState) {
      console.log(`Signaling state change: ${peerConnection.signalingState}`);
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log(
      `ICE connection state change: ${peerConnection.iceConnectionState}`
    );
    if (peerConnection.iceConnectionState == "disconnected") {
      peerConnection.close();
      peerConnection = null;
      gotSDPSignal = false;
      busyFlag = false;
      remoteVideo.srcObject = null;
      remoteVideo.parentElement.classList.add("hidden");
    }
  };

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
        remoteVideo.parentElement.classList.remove("hidden");
      }
    }
  };
};

// TODO: modularize some of the operations below, it's kinda hard to read.
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
        } else if (!busyFlag && !(message.uuid in notificationBlacklist)) {
          notificationBlacklist[message.uuid] = true;
          alertMessage(message.busy, isAuthenticated);
        }
      }
    } else {
      if (!peerConnection) {
        busyFlag = true;
        createPeerConnection();
      }
      if (message.type === "new-ice-candidate") {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      } else if (message.type === "sdp-signal") {
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
    busyFlag = true;
    createPeerConnection();
    try {
      const offer = await peerConnection.createOffer();
      createDescription(offer);
    } catch (error) {
      errorHandler(error);
    }
  }
};

// NOTE: I can't really stop the pinging because this is how we alert other users trying to join the call (patients and doctors).
// i.e. even if we already established a connection we should still ping the server (as doctors) in case other users are trying to
// join the (busy) call, in which case we alert them (see alertMessage below).
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
      // NOTE: the 1 second interval below is arbitrary, this is possible something worth thinking about.
      startPing(1000);
    }
  }
};

const alertMessage = (senderIsBusy, receiverIsAuthenticated) => {
  if (!senderIsBusy) {
    if (receiverIsAuthenticated) {
      window.alert(
        "It seems like another doctor is currently in this call, please check your other devices and close any tabs referencing this room.\n\nTrying to access the same room from different devices using the same account might cause this error."
      );
    }
  } else {
    if (!receiverIsAuthenticated) {
      window.alert(
        "The video call you're trying to join is currently full, please wait."
      );
    } else {
      window.alert(
        "The video call you're trying to join already has a registered doctor, please check your other devices and close any tabs referencing this room.\n\nTrying to access the same room from different devices using the same account might cause this error."
      );
    }
  }
};

// EXPORTED FUNCTIONS

export const initLocalVideo = async (startPeerConnection) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    getUserMediaSuccess(stream, startPeerConnection);
    localVideo.parentElement.classList.remove("hidden");
  } catch (error) {
    errorHandler(error);
  }
};

export const authenticateUser = (authenticationResult) => {
  isAuthenticated = authenticationResult;
};
