const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const compression = require("compression");
const apiRouter = require("./routes/apiRoutes.js");

const app = express();

// IMPLEMENTING CORS SO THAT OTHER WEBSITES CAN USE OUR API
app.use(cors()); // THIS WILL WORK FOR SIMPLE REQUESTS LIKE (GET AND POST) BUT NOT FOR (PATCH, DELETE or PUT). or for cookies
app.use(express.json());
// FOR NON-SIMPLE REQUEST WE USE app.options request.
app.options("*", cors()); // app.options() is just like app.get or post etc.

app.use(cookieParser()); // TO READ COOKIES SENT FROM CLIENT

// USE THIS MIDDLEWARE TO COMPRESS TEXT RESPONSE THAT WE SENT TO CLIENTS
app.use(compression());

// if (process.env.NODE_ENV === "development") {
//     app.use(morgan("dev"));
// }

app.use("/api/v1", apiRouter);

app.all("*", (req, res, next) => {
    res.status(200).json({
        status: 404,
        error: "Invalid URL.",
        result: null,
    });
});

module.exports = app;
