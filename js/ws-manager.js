// UUID creation logic taken from http://stackoverflow.com/a/105074/515584.

const createUUID = () => {
  const s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

const wsManager = function () {
  riot.observable(this); // Riot.js global (CDN import in video-call.html).
  this.uuid = createUUID();
  this.serverConnection = io(); // Socket.io global (CDN import in video-call.html).
  this.isOpen = function () {
    return this.serverConnection.readyState === this.serverConnection.OPEN;
  };
};

export const initWsManager = () => {
  let ws_manager = new wsManager();

  ws_manager.serverConnection.onopen = function (event) {
    ws_manager.trigger("sendmessage", {
      type: "signal",
      messageData: {
        uuid: ws_manager.uuid,
        open: true,
      },
    });
  };

  ws_manager.serverConnection.onmessage = function (messageData) {
    var message = JSON.parse(messageData.data);

    if (
      message.type &&
      (message.type === "signal" ||
        message.type === "chat" ||
        message.type === "pong")
    ) {
      ws_manager.trigger(message.type, message.messageData);
    }
  };

  ws_manager.on("sendmessage", function (messageData) {
    messageData.uuid = this.uuid;
    this.serverConnection.send(JSON.stringify(messageData));
  });

  return ws_manager;
};
