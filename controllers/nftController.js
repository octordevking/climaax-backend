const { getExisitingNfts, getExistingNftsIds } = require("../models/nftModel.js");
const Utils = require("../utils/utils.js");

exports.getAccountNfts = Utils.catchAsync( async (req, res) => {
    try {
        const {accountAddress} = req.query;

        if (!accountAddress) return res.status(400).json({message: 'failed to fetch nfts', error: 'Bad requests'});
        
        const nftList = Utils.getNftsOfAccount(accountAddress);
        return res.status(200).json({
            status: 200,
            result: nftList,
            error: null
        })
    } catch (error){
        return res.status(500).json({message: 'failed to fetch nfts', error: 'Internal server error'});
    }
});

exports.getNftList = Utils.catchAsync( async (req, res) => {
    try {
        const {offset, limit} = req.query;
        const nfts = await getExisitingNfts(offset, limit);
        console.log("NFTs: ", nfts);
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
        const {walletAddresss} = req.query;
        const existingNFTsIds = await getExistingNftsIds();
        const account_nfts = await Utils.getNftsOfAccount(walletAddresss);
        const nfts = account_nfts.filter(nft => existingNFTsIds.includes(nft.nft_id));
        return res.status(200).json({
            status: 200,
            result: nfts,
            error: null
        });
    } catch (error){
        return res.status(500).json({message: 'failed to fetch nfts', error: 'Internal server error'});
    }
})
