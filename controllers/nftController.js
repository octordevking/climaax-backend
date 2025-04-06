const { getExisitingNfts, getExistingNftsIds } = require("../models/nftModel.js");
const Utils = require("../utils/utils.js");

exports.getNftList = Utils.catchAsync( async (req, res) => {
    try {
        const {offset, limit} = req.query;
        const nfts = await getExisitingNfts(offset, limit);
        return res.status(200).json({
            status: 200,
            result: nfts,
            error: null
        })
    } catch (error){
        return res.status(500).json({message: 'failed to fetch nfts', error: 'Internal server error'});
    }
});

exports.getVerifiedNfts = Utils.catchAsync( async (req, res) => {
    try {
        // const {offset, limit} = req.query;
        const {walletAddress} = req.query;
        console.log(walletAddress)
        const account_nfts = await Utils.getVerifiedNftsOfAccount(walletAddress);
        return res.status(200).json({
            status: 200,
            result: account_nfts,
            error: null
        });
    } catch (error){
        return res.status(500).json({message: 'failed to fetch nfts', error: 'Internal server error'});
    }
});

exports.getValidatedSgbNfts = Utils.catchAsync(async (req, res) => {
    try{

    }
    catch (error){

    }
});

exports.getVerifiedSgbNfts = Utils.catchAsync(async (req, res) => {
    try{
        const sgbAddress = req.query.sgbAddress;
        const account_nfts = await Utils.getVerifiedSgbNftsOfAccount(sgbAddress);
        return res.status(200).json({
            status: 200,
            result: account_nfts,
            error: null
        });

    } catch (error){
        console.error("Error occured in SGB nft fetching", error);
    }
});