const mysql = require('mysql');
const util =require('util');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const getConnection = util.promisify(pool.getConnection).bind(pool);
// Increase max_allowed_packet after connection
(async () => {
    const connection = await getConnection();
    const queryPromise = util.promisify(connection.query).bind(connection);
    await queryPromise(`SET GLOBAL max_allowed_packet=1073741824;`);
})();


module.exports = {
    XRP_RPC: "wss://s2.ripple.com/",
    url: {
        xummRedirect: "https://anonymousnfts.space",
    },
    payloadExpireTime: 10, //minute
    getConnection
}

