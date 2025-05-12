const Utils = require("../utils/utils.js");
const xrpl = require("xrpl");
const { XummSdk } = require("xumm-sdk");
const verifySignature = require("verify-xrpl-signature").verifySignature;
const Config = require("../utils/config");

const xummSdk = new XummSdk(process.env.XUMM_API_KEY, process.env.XUMM_API_SECRET);



exports.signinXumm = Utils.catchAsync(async (req, res) => {
    try {
        const isMobile = JSON.parse(req.query.isMobile);
        const request = {
            txjson: { TransactionType: "SignIn" },
            options: {
                expire: Config.payloadExpireTime,
                return_url: isMobile
                    ? {
                        app: Config.url.xummRedirect,
                    }
                    : {},
            },
        };

        const payload = await xummSdk.payload.create(request);

        res.status(200).json({
            status: 200,
            result: payload,
            error: null
        });
    } catch (error) {
        console.error("Error in signinXumm: ", error);
        res.status(500).json({
            status: 500,
            result: null,
            error: error.message
        });
    }
});

exports.getPayload = Utils.catchAsync(async (req, res) => {
    const payload = await xummSdk.payload.get(req.query.uuid);

    res.status(200).json({
        status: 200,
        result: payload,
        error: null
    });
});

exports.checkSign = Utils.catchAsync(async (req, res) => {
    const resp = verifySignature(req.query.hex);
    if (!resp.signatureValid) {
        throw new Error("Invalid signature");
    }

    console.log("resp: ", resp);
    const xrpAddress = resp.signedBy;

    res.status(200).json({
        status: 200,
        result: {
            xrpAddress: xrpAddress
        },
        error: null
    });
});

exports. getAccountValue = Utils.catchAsync(async (req, res) => {
    console.log("Wallet:", Utils.getTreasuryWallet().address);
    try {
        const address = req.query.address;
        const tokens = await Utils.getBalance(address);
        const account_info = await Utils.getAccountInfo(address);
        const xrpBalance = account_info.result.account_data.Balance;
        let aax = [];
        if (tokens.length > 0){
            aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);
        }
        const trustline = (aax.length > 0)
        if (aax.length === 0) {
            aax = [{
                balance: 0,
                limit: 0
            }];
        }

        res.status(200).json({
            status: 200,
            result: {
                aax: aax[0],
                xrp: xrpBalance,
                trustline: trustline
            },
            error: null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: 500,
            result: null,
            error: error.message
        });
    }
});

exports.getAccountOldValue = Utils.catchAsync(async (req, res) => {
    const address = req.query.address;
    const results = await Utils.getBalance(address);

    const tokens = results.lines;
    let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.OLD_TOKEN_ISSUER);

    if (aax.length === 0) {
        aax = [{
            balance: 0,
            limit: 0
        }];
    }

    res.status(200).json({
        status: 200,
        result: aax[0],
        error: null
    });
});

exports.getStakePayload = async (address, amount, selectStake, isMobile) => {
    const txJson = {
        TransactionType: 'Payment',
        Account: address,
        Destination: process.env.TREASURY_ACCOUNT,
        Amount: {
            currency: process.env.TOKEN_SYMBOL,
            issuer: process.env.TOKEN_ISSUER,
            value: amount,
        },
        Memos: [{
            Memo: {
                MemoType: Buffer.from('Staking').toString('hex').toUpperCase(),
                MemoData: Buffer.from(`Staked ${amount} ${process.env.TOKEN_SYMBOL} for ${selectStake.duration} months.`).toString('hex').toUpperCase(),
            },
        }],
    };

    const request = {
        txjson: txJson,
        options: {
            expire: Config.payloadExpireTime,
            return_url: isMobile
                ? {
                    app: Config.url.xummRedirect,
                }
                : {},
        },
    };

    const payload = await xummSdk.payload.createAndSubscribe(
        request,
        async (result) => {
            if (result.data.signed) {
                console.log("depositBalance log - 4 : ", result.data);
                result.resolve("Ok");
            }

            if (result.data.expires_in_seconds <= 0) {
                console.log("depositBalance log - 5 : ", result.data);
                result.resolve("Ok");
            }
        }
    );

    if (payload.created.uuid) {
        return payload.created;
    } else {
        return null;
    }
};

exports.getTrustlinePayload = async (address, isMobile) => {
    const requestJson = {
        TransactionType: 'TrustSet',
        Account: address,
        LimitAmount: {
            currency: process.env.TOKEN_SYMBOL,
            issuer: process.env.TOKEN_ISSUER,
            value: "9999999",
        }
    };

    const request = {
        txjson: requestJson,
        options: {
            expire: Config.payloadExpireTime,
            return_url: isMobile
                ? {
                    app: Config.url.xummRedirect,
                }
                : {},
        },
    };

    const payload = await xummSdk.payload.createAndSubscribe(
        request,
        async (result) => {
            if (result.data.signed) {
                result.resolve("Ok");
            } if (result.data.expires_in_seconds <= 0) {
                result.resolve("Ok");
            }
        }
    );

    if (payload.created.uuid) {
        return payload.created;
    } else {
        return null;
    }
};

exports.getSwapPayload = async (address, swapAmount, toAmount, isMobile) => {
    try {
        const offerCreateTx = {
            TransactionType: "OfferCreate",
            Account: address,
            TakerGets: swapAmount,
            TakerPays: {
                currency: process.env.TOKEN_SYMBOL,
                issuer: process.env.TOKEN_ISSUER,
                value: parseFloat(toAmount).toString(),
            },
            Flags: 0x00040000
        };
        
        const request = {
            txjson: offerCreateTx,
            options: {
                expire: Config.payloadExpireTime,
                return_url: isMobile
                    ? {
                        app: Config.url.xummRedirect,
                    }
                    : {},
            },
        }

        const payload = await xummSdk.payload.createAndSubscribe(
            request,
            async (result) => {
                if (result.data.signed) {
                    console.log("swapBalance log - 4 : ", result.data);
                    result.resolve("Ok");
                }

                if (result.data.expires_in_seconds <= 0) {
                    console.log("swapBalance log - 5 : ", result.data);
                    result.resolve("Ok");
                }
            }
        );

        if (payload.created.uuid) {
            return payload.created;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error in getSwapPayload: ", error);
        throw new Error("Failed to create swap payload");
    }

};