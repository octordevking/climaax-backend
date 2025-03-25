const apiController = require("../controllers/apiController.js");
const xummController = require("../controllers/xummController.js");
const express = require("express");
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

module.exports = router;
