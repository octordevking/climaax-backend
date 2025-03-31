const apiController = require("../controllers/apiController.js");
const xummController = require("../controllers/xummController.js");
const nftController = require("../controllers/nftController.js")
const express = require("express");
const { getExisitingNfts } = require("../models/nftModel.js");
const router = express.Router();

router.post('/stake', apiController.saveStake);
router.post('/stake/payload', apiController.getStakePayload);
router.post('/swap', apiController.swap);
router.post('/swap/payload', apiController.getSwapPayload);
router.post('/trustline', apiController.getTrustline);
router.get('/stake/logs', apiController.getStakeLogs);
router.get('/stake/options', apiController.getStakeOptions);
router.get("/account", xummController.getAccountValue);
router.get("/account/old", xummController.getAccountOldValue);
router.get("/signin-xumm", xummController.signinXumm);
router.get("/get-payload", xummController.getPayload);
router.get("/check-sign", xummController.checkSign);
router.get("/nfts/account-nfts", nftController.getAccountNfts);
router.get("/nfts/nftlist", nftController.getNftList);
router.get("/nfts/verified-nfts", nftController.getVerifiedNfts);

module.exports = router;
