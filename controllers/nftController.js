const nftModel = require("../models/nftModel.js");
const Utils = require("../utils/utils.js");

exports.getNftList = Utils.catchAsync( async (req, res) => {
    try {
        const {offset, limit} = req.query;
        const nfts = await nftModel.getExisitingNfts(offset, limit);
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

exports.setVerifiedXrpStatus = Utils.catchAsync(async (req, res) => {
    try {
        const { address, verified, points } = req.body;
        const result = await nftModel.setXrpVerifiedStatus(address, points, verified);
        return res.status(200).json({
            status: 200,
            result: result,
            error: null
        });
    } catch (error) {
        console.error("Error occurred in setting verified status", error);
        return res.status(500).json({
            status: 500,
            result: null,
            message: 'failed to set verified status', 
            error: 'Internal server error' 
        });
    }
});

exports.setVerifiedSgbStatus = Utils.catchAsync(async (req, res) => {
    try {
        const { address, points, xrpAddress } = req.body;
        console.log("Params", address, points, xrpAddress);
        const result = await nftModel.setSgbVerifiedStatus(address, points, xrpAddress);
        if (result.success === false) {
            return res.status(400).json({
                status: 400,
                result: null,
                message: result.message,
                error: 'For new SGB account, XRP address is required'
            });
        }
        return res.status(200).json({
            status: 200,
            result: result,
            error: null
        });
    } catch (error) {
        console.error("Error occurred in setting verified status", error);
        return res.status(500).json({
            status: 500,
            result: null,
            message: 'failed to set verified status', 
            error: 'Internal server error' 
        });
    }
});