const util = require("util");
const dotenv = require("dotenv");
const Config = require("../utils/config");
const moment = require('moment');

dotenv.config();

exports.getExistingNftsIds = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const rows = await queryPromise(`SELECT nft_id FROM validated_nfts`);
        if (!rows) return [];
        const existingNFTsIds = rows.map(row => row.nft_id);
        return existingNFTsIds;
    } catch (error) {
        console.error('Error executing query:', error);
        return []
    }
};

exports.getExisitingNfts = async (offset, limit) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        if (offset === undefined || limit === undefined) {
            const rows = await queryPromise(`SELECT * FROM validated_nfts where is_burned = 0 ORDER BY last_updated DESC; `);
            return rows;
        }
        const rows = await queryPromise(`SELECT * FROM validated_nfts where is_burned = 0 ORDER BY last_updated DESC  LIMIT ${limit} OFFSET ${offset}; `);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
};

exports.getBurnedNftsIds = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const [rows] = await queryPromise(`SELECT * FROM validated_nfts WHERE is_burned = 1`);
        const burnedNFTsIds = rows.map(row => row.nft_id);
        return burnedNFTsIds;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

exports.insertNfts = async (nfts) => {
    let connection;
    try {
        if (nfts.length === 0) return;
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const values = nfts.map(nft => [
            nft.nft_id, 
            nft.ledger_index, 
            nft.owner, 
            nft.uri, 
            nft.flags, 
            nft.is_burned, 
            nft.transfer_fee, 
            nft.issuer,
            nft.nft_taxon, 
            nft.serial, 
            last_updated = new Date()]
        );
        await queryPromise(`INSERT INTO validated_nfts (nft_id, ledger_index, owner, uri, flags, is_burned, transfer_fee, issuer, nft_taxon, nft_serial, last_updated) VALUES ?`, [values]);
        
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

exports.updateBurnedNfts = async (burnedNftsIds) => {
    try {
        const connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        await queryPromise(`UPDATE validated_nfts SET is_burned = 1 WHERE nft_id IN (?)`, [burnedNftsIds]);
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

exports.getPointsByTaxonId = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const rows = await queryPromise(
            `SELECT points, nft_taxon FROM xrp_nft_collections`
        );
        if (!rows) return [];
        const taxonPoints = [];
        rows.forEach(row => {
            taxonPoints[row.nft_taxon] = row.points;
        });
        console.log("Points: ", taxonPoints[10111]);
        return taxonPoints;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
};

exports.getPointsArrayOfSgb = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const rows = await queryPromise(
            `SELECT A.id, A.contract_address, A.nft_id, A.abbreviation, A.points, A.category_id, B.name as category_name  FROM sgb_nfts A LEFT JOIN sgb_nft_types B ON A.category_id = B.id`
        );
        if (!rows) return [];

        const pointsArray = rows.map(row => ({
            id: row.id,
            contract_address: row.contract_address.toLowerCase(),
            nft_id: row.nft_id,
            abbreviation: row.abbreviation,
            points: row.points,
            category_id: row.category_id,
            category_name: row.category_name
        }));
        return pointsArray;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

exports.setXrpVerifiedStatus = async (address, points, verified) => {
    let connection;
    try {
        if (verified) {
            const existanceCheck = await exports.getXrpVerifiedStatus(address);
            const currentDateString = moment().tz("Africa/Abidjan").format("YYYY-MM-DD");
            connection = await Config.getConnection();
            const queryPromise = util.promisify(connection.query).bind(connection);
            
            if (existanceCheck.length > 0) {
                const results = await queryPromise(
                    `UPDATE verified_accounts SET xrp_verified_date = ?, xrp_verified_points = ? WHERE xrp_address = ?`, 
                    [currentDateString, points, address]
                );
                return results;
            } else {
                const results = await queryPromise(
                    `INSERT INTO verified_accounts (xrp_verified_date, xrp_verified_points, xrp_address) VALUES (?, ?, ?)`, 
                    [currentDateString, points, address]
                );
                return results;
            }
        }
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.getXrpVerifiedStatus = async (address) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(
            `SELECT xrp_verified_date, xrp_verified_points FROM verified_accounts WHERE xrp_address = ?`, 
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

exports.setSgbVerifiedStatus = async (address, points, xrpAddress) => {
    let connection;
    try {
        const existanceCheck = await exports.getSgbVerifiedStatus(address);
        const currentDateString = moment().tz("Africa/Abidjan").format("YYYY-MM-DD");
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);

        if (existanceCheck.length > 0) {
            const res = await queryPromise(
                `UPDATE verified_accounts SET sgb_verified_date = ?, sgb_verified_points = ? WHERE sgb_address = ? AND (YEAR(sgb_verified_date) <> YEAR(CURDATE()) OR MONTH(sgb_verified_date) <> MONTH(CURDATE()))`, 
                [currentDateString, points, address]
            );
            return {
                success: true,
                data: res
            }
        }

        if (!xrpAddress) {
            return { success: false, message: "XRP address is required for new SGB account." };
        }
        const res = await queryPromise(
            `UPDATE verified_accounts SET sgb_address = ?, sgb_verified_date = ?, sgb_verified_points = ? WHERE xrp_address = ?`, 
            [address, currentDateString, points, xrpAddress]
        );
        return {
            success: true,
            data: res
        };
    } catch (error) {
        console.error('Error set sgb verified status query:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

exports.getSgbVerifiedStatus = async (address) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(
            `SELECT sgb_verified_date, sgb_verified_points FROM verified_accounts WHERE sgb_address = ?`, 
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

exports.getRewardsState = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const oneMonthAgo = moment().subtract(1, 'months').tz("Africa/Abidjan");
        const queryPromise = util.promisify(connection.query).bind(connection);
        // console.log(oneMonthAgo, oneMonthAgo.year(), oneMonthAgo.month(), oneMonthAgo.year(), oneMonthAgo.month())
        const results = await queryPromise(
            `SELECT id, xrp_address, xrp_verified_points, sgb_verified_points, (YEAR(xrp_verified_date) = ? AND MONTH(xrp_verified_date) = ?) as xrp_verified, (YEAR(sgb_verified_date) = ? AND MONTH(sgb_verified_date) = ?) as sgb_verified FROM verified_accounts WHERE (YEAR(xrp_verified_date) = ? AND MONTH(xrp_verified_date) = ? ) OR (YEAR(sgb_verified_date) = ? AND MONTH(sgb_verified_date) = ? )`,
            [oneMonthAgo.year(), oneMonthAgo.month() + 1, oneMonthAgo.year(), oneMonthAgo.month() + 1, oneMonthAgo.year(), oneMonthAgo.month() + 1, oneMonthAgo.year(), oneMonthAgo.month() + 1]
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

exports.insertRewardsHistory = async (query) => {
    let connection;
    try {
        connection = await Config.getConnection();
        const queryPromise = util.promisify(connection.query).bind(connection);
        await queryPromise(
            `INSERT INTO reward_history (txn_hash, to_address, verified_account_id, amount, success, note, timestamp) VALUES  ?`, 
            [query]
        );
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}

exports.getTotalPoints = async () => {
    let connection;
    try {
        connection = await Config.getConnection();
        const oneMonthAgo = moment().subtract(1, 'months').tz("Africa/Abidjan");
        const queryPromise = util.promisify(connection.query).bind(connection);
        const results = await queryPromise(
            `SELECT SUM(xrp_verified_points) as xrp_total, SUM(sgb_verified_points) as sgb_total, (YEAR(xrp_verified_date) = ? AND MONTH(xrp_verified_date) = ?) as xrp_verified, (YEAR(sgb_verified_date) = ? AND MONTH(sgb_verified_date) = ?) as sgb_verified FROM verified_accounts WHERE (YEAR(xrp_verified_date) = ? AND MONTH(xrp_verified_date) = ? ) OR (YEAR(sgb_verified_date) = ? AND MONTH(sgb_verified_date) = ? )`,
            [oneMonthAgo.year(), oneMonthAgo.month() + 1, oneMonthAgo.year(), oneMonthAgo.month() + 1, oneMonthAgo.year(), oneMonthAgo.month() + 1, oneMonthAgo.year(), oneMonthAgo.month() + 1]
        );
        if (!results) return 0;
        const xrpVerified = results[0].xrp_verified;
        const sgbVerified = results[0].sgb_verified;
        const xrpTotal = results[0].xrp_total || 0;
        const sgbTotal = results[0].sgb_total || 0;
        const totalPoints = (xrpVerified === 1 ? xrpTotal : 0) + (sgbVerified === 1 ? sgbTotal : 0);
        return totalPoints;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}