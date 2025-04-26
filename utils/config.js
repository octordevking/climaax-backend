const mysql = require('mysql2');
const util =require('util');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 30,
    queueLimit: 100,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.join(__dirname, 'ca.pem'))  // adjust if file is elsewhere
    }
});

const getConnection = util.promisify(pool.getConnection).bind(pool);
// Increase max_allowed_packet after connection
// (async () => {
//     const connection = await getConnection();
//     const queryPromise = util.promisify(connection.query).bind(connection);
//     await queryPromise(`SET SESSION max_allowed_packet=1073741824;`);
// })();

const TOYBOX_TAXONS = new Set([
    10106, 10107, 10108, 10109, 10110, 10111, // TB1X – TB6X
    7, 9, 10, 12,                             // TB7X – TB10X
    15, 16,                                   // TBXV2-1, TBXV2-2
    10109                                     // TBXV2-4 (repeats TB4X taxon, maybe double check?)
]);

const XRPLC_TAXONS = new Set([
    10100, 10101, 10102,    // AAXRPLX, AAXRPL1, AAXRPL2
    10103,                  // PG
    8, 14,                  // Warrior (8), Warrior #21–30 (14)
    11,                     // Cyborgs
    10117,                  // A.A. pixel
    76168363,               //CK
    //CT missing taxons — add if known
]);

const TOYBOX_ABB_SGB = new Set([
    'TB1S', 'TB2S'
]);

const MASTERPIECES_ABB_SGB = new Set([
    'BS',
    'L',
    'P',
    'R',
    'X',
    'BP',
    'ANFTA',
    'FS',
    'AR',
    'PXM',
    'SS'
]);

const SGB_COLLECTIBLE_ABB = new Set([
    'AASGB',
]);

module.exports = {
    XRP_RPC: "wss://s2.ripple.com/",
    url: {
        xummRedirect: "https://anonymousnfts.space",
    },
    payloadExpireTime: 10, //minute
    getConnection,
    XRPLC_TAXONS,
    TOYBOX_TAXONS,
    TOYBOX_ABB_SGB,
    MASTERPIECES_ABB_SGB,
    SGB_COLLECTIBLE_ABB,
}

