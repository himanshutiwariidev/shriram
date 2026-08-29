let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
  // Allow clients to join tenant-scoped broadcast rooms and chat rooms
  io.on("connection", (socket) => {
    socket.on("join:tenant", (tenantId) => {
      socket.join(`tenant:${tenantId}`);
    });
    socket.on("join:chat", ({ tenantId, roomId }) => {
      socket.join(`chat:${tenantId}:${roomId}`);
    });
    socket.on("leave:chat", ({ tenantId, roomId }) => {
      socket.leave(`chat:${tenantId}:${roomId}`);
    });
  });
};

const getSocketIO = () => ioInstance;

const emitAttendanceEvent = (event, payload) => {
  if (!ioInstance) return;

  ioInstance.emit(event, payload);
  ioInstance.emit("attendance:updated", {
    event,
    payload,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  setSocketIO,
  getSocketIO,
  emitAttendanceEvent,
};
