// TODO: modularize this file.

const constraints = (window.constraints = {
  audio: true,
  video: true,
});

const handleSuccess = (stream) => {
  const video = document.getElementById("video");
  video.srcObject = stream;
};

const handleError = (error) => {
  // TODO: improve error handling.
  console.error(error);
};

const initVideoPreview = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
  } catch (erro) {
    handleError(error);
  }
};

window.addEventListener("DOMContentLoaded", () => {
  initVideoPreview();
});
