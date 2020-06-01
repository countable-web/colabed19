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
  const socket = new WebSocket(`ws://${window.location.hostname}:1337`);
  let socketWrapper = {
    socket,
  };

  socketWrapper.uuid = createUUID();
  socketWrapper.socket.onmessage = (messageJSON) => {
    const message = JSON.parse(messageJSON.data);
    if (message.type && (message.type === 'pong')) {
      console.log(message);
    }
  };
  socketWrapper.isOpen = () => {
    return socketWrapper.socket.readyState === socketWrapper.socket.OPEN;
  };

  return socketWrapper;
};
