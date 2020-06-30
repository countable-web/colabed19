import { initLocalVideo, authenticateUser } from "./main.js";

window.addEventListener("DOMContentLoaded", () => {
  const authenticateUserButton = document.getElementById("authenticate-user");
  authenticateUserButton.addEventListener("click", (event) => {
    authenticateUser(window.confirm("Authenticate user as a doctor?"));
    initLocalVideo("local-video");
  });
});