const mysql = require("mysql");
const util = require("util");
const moment = require('moment');
const dotenv = require("dotenv");
const { checkTransactionValidity } = require("../utils/utils");
const Config = require("../utils/config");
require("moment-timezone");

dotenv.config();

exports.queryPossibleStakeOptions = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(`SELECT * FROM stake_options WHERE visibility = 1`);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.queryAllStakeOptions = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(`SELECT * FROM stake_options`);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.queryStakeLogsByAddress = async (address) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(
            `SELECT * FROM transactions 
            LEFT JOIN stake_options ON transactions.stake_option = stake_options.id
            WHERE transactions.from_address = ?`, 
            [address]
        );
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.queryAllStakeLogs = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(`SELECT A.*, B.* FROM transactions A
            LEFT JOIN stake_options B ON A.stake_option = B.id
            WHERE flag = 0 AND reward_trx IS NULL
        `);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.updateStakeLog = async (trx_hash, reward_trx, amount) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);

        const results = await queryPromise(
            `UPDATE transactions 
             SET flag = 1, reward_trx = ?, reward_amount = ?, rewarded_at = ? 
             WHERE trx_hash = ?`,
            [reward_trx, amount, new Date(), trx_hash]
        );

        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.saveNewStake = async ({ txid, address, amount, option }) => {
    let connection;
    const now = moment().tz("Africa/Abidjan");
    try {
        connection =await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(`
            INSERT INTO transactions (trx_hash, amount, stake_option, from_address, to_address, created_at) VALUES (?,?,?,?,?,?)`, [
            txid,
            amount,
            option,
            address,
            process.env.TREASURY_ACCOUNT,
            now.toISOString(),
        ]);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.saveSwap = async ({ txid, address, amount }) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(`
            INSERT INTO swap (trx_hash, address, amount) VALUES (?,?,?)`, [
            txid,
            address,
            amount
        ]);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.updateSwap = async ({ txid, tx_hash }) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(`
            UPDATE swap 
            SET reward_hash = ? 
            WHERE trx_hash = ?`,
            [
                tx_hash,
                txid
            ]);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}