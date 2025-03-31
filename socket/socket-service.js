const { getExisitingNfts } = require('../models/nftModel');
const {createSocketServer} = require('./socket-config');

let socketIO = null;

const startSocketService = (app) => {
    socketIO = createSocketServer(app, (socket) => {
        console.log("Client connected");
        socket.on("nftlist", async () => {
            const nfts = await getExisitingNfts();
            socket.emit("nftlist", nfts);
        });
    });
};

const sendSocketMessage = async (message, data) => {
    if (socketIO) {
        socketIO.emit(message, data);
    }
}

module.exports = {
    startSocketService,
    sendSocketMessage,
};
