import { initLocalVideo, authenticateUser } from "./main.js";

window.addEventListener("DOMContentLoaded", () => {
  const authenticateUserButton = document.getElementById("authenticate-user");
  const localVideo = document.getElementById("local-video");
  const toggleVideoButton = document.getElementById("toggle-video");
  const toggleSoundButton = document.getElementById("toggle-sound");
  const remoteVideoWrapper = document.getElementById("remote-video-wrapper");

  authenticateUserButton.addEventListener("click", (event) => {
    authenticateUser(
      window.confirm(
        'Authenticate user as a doctor?\n\nNote: clicking "Cancel" will authenticate you as a patient.'
      )
    );
    event.currentTarget.parentElement.classList.add("hidden");
    initLocalVideo(true);
  });

  toggleVideoButton.onclick = () => {
    if (localVideo.srcObject.getTracks()[1].enabled) {
      toggleVideoButton.classList.add("toggle-button-off");
      localVideo.srcObject.getTracks()[1].enabled = false;
    } else {
      toggleVideoButton.classList.remove("toggle-button-off");
      localVideo.srcObject.getTracks()[1].enabled = true;
    }
  };

  toggleSoundButton.onclick = () => {
    if (localVideo.srcObject.getTracks()[0].enabled) {
      toggleSoundButton.classList.add("toggle-button-off");
      localVideo.srcObject.getTracks()[0].enabled = false;
    } else {
      toggleSoundButton.classList.remove("toggle-button-off");
      localVideo.srcObject.getTracks()[0].enabled = true;
    }
  };

  remoteVideoWrapper.onclick = (even) => {
    if (remoteVideoWrapper.classList.contains("video-fullscreen")) {
      remoteVideoWrapper.classList.remove("video-fullscreen");
    } else {
      remoteVideoWrapper.classList.add("video-fullscreen");
    }
  }
});
