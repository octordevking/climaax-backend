const dotenv = require("dotenv");
const app = require("./app.js");
const http = require('http');

dotenv.config({ path: "./config.env" });

// IT SHOULD BE ON TOP SO THAT WE CATCH EVERY ERROR
// SOLVING UNCAUGHT EXCEPTION (for example a variable that is undefined)
process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION. Shutting Down! 🤦‍♂️");
    console.log(err.name, err.message);
    console.log(err);
    // 0 for success
    // 1 for uncaught exception
    process.exit(1);
});

const server = http.createServer(app);

let port = process.env.PORT || 8000;
server.listen(port, () => {
    console.log("Listening at port: ", port);
});

// SOLVING UNHANDLED REJECTION (catch promise rejections etc)
process.on("unhandledRejection", (err) => {
    console.log("🤷‍♂️ UNHANDLED REJECTION. Shutting Down! 🤦‍♂️");
    console.log(err.name, err.message);
    console.log(err);
    server.close(() => {
        // 0 for success
        // 1 for uncaught exception
        process.exit(1);
    });
});

// THIS ERROR OCCURS ON HEROKU SO WE HAVE TO CATCH IT.
process.on("SIGTERM", () => {
    console.log("👌 SIGTERM RECIEVED. Shutting Down! 🤦‍♂️");
    server.close(() => {
        console.log("💥🔥 Process terminated.");
    });
});
