
const http = require('http');
const socketIo = require('socket.io');
require("dotenv").config();

var sockets = {};
var io;

const createSocketServer = (app, sendStatus) => {
    const server = http.createServer(app);
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        socket.on("disconnect", () => {
            console.log("Client disconnected");
        });
    });

    server.listen(process.env.SOCKET_PORT, () => {
        console.log(`Socket server listening on port ${process.env.SOCKET_PORT}`);
    });

    return io;
};

module.exports = {
    createSocketServer,
}