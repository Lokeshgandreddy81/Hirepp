// Uses existing Socket.IO connection for signaling
export const initiateCall = (socket, roomId, callerId) => {
    socket.emit('call_initiate', { roomId, callerId });
};

export const answerCall = (socket, roomId) => {
    socket.emit('call_answer', { roomId });
};

export const endCall = (socket, roomId) => {
    socket.emit('call_end', { roomId });
};
