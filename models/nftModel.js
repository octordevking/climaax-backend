const util = require("util");
const dotenv = require("dotenv");
const Config = require("../utils/config");
const { off } = require("process");

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