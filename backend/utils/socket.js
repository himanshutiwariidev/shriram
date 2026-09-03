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
    // Support chat rooms
    socket.on("join:support", (tenantId) => {
      socket.join(`support:${tenantId}`);
    });
    socket.on("leave:support", (tenantId) => {
      socket.leave(`support:${tenantId}`);
    });
    // Superadmin joins a single room to receive all tenant support events
    socket.on("join:superadmin:support", () => {
      socket.join("superadmin:support");
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
