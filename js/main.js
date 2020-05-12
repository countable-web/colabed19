import { initWsManager } from "./ws-manager.js";

// Based on https://github.com/webrtc/FirebaseRTC/.

let peerConnection = null;
let localStream = null;
let remoteStream = null;
let roomDialog = null;
let roomId = null;
let gotSDPSignal = false;
let ws_manager = null;

// Setup:

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

// Utility functions:

const registerPeerConnectionListeners = () => {
  peerConnection.addEventListener("icegatheringstatechange", () => {
    console.log(
      `ICE gathering state changed: ${peerConnection.iceGatheringState}`
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
  });
};

const startPing = (interval) => {
  setInterval(function () {
    ws_manager = initWsManager();
    if (ws_manager.isOpen()) {
      console.log("Ping!", "\nbusyFlag: ", busyFlag);
      ws_manager.trigger("sendmessage", {
        type: "ping",
        messageData: {
          uuid: ws_manager.uuid,
          busy: busyFlag,
        },
      });
    }
  }, interval);
};

const getUserMediaSuccess = (stream, id) => {
  localStream = stream;
  const video = document.getElementById(id);
  video.srcObject = stream;
  if (id === "local-video") {
    // NOTE: Not finished.
    // startPing(1000);
  }
};

const getUserMediaError = (error) => {
  // TODO: improve error handling.
  console.error(error);
};

// Exported functions:

export const initLocalVideo = async (id) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    getUserMediaSuccess(stream, id);
  } catch (error) {
    getUserMediaError(error);
  }
};

export const createRoom = async () => {
  console.log(
    "Create PeerConnection with configuration: ",
    peerConnectionConfig
  );
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  registerPeerConnectionListeners();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
};
