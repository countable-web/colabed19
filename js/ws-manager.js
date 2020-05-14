// UUID creation logic taken from http://stackoverflow.com/a/105074/515584.

const createUUID = () => {
  const s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  };
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

export const initSocket = () => {
  const socket = io(); // Socket.io global (CDN import in video-call.html).
  let socketWrapper = {
    socket,
  };

  socketWrapper.uuid = createUUID();
  // "ping" and "pong" are reserved event names: https://github.com/socketio/socket.io/issues/2414#issuecomment-176727699.
  socketWrapper.socket.on("bong", (message) => {
    console.log(JSON.parse(message));
  });
  socketWrapper.isOpen = () => {
    return socketWrapper.socket.readyState === socketWrapper.socket.OPEN;
  };

  return socketWrapper;
};
