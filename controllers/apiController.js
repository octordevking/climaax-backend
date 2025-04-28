const moment = require('moment');
const Utils = require("../utils/utils.js");
const StakeModel = require("../models/stakeModel.js");
const XummController = require('./xummController.js');

require("moment-timezone");

exports.getStakeOptions = Utils.catchAsync(async (req, res) => {
  const results = await StakeModel.queryAllStakeOptions();

  res.status(200).json({
    status: 200,
    result: results,
    error: null
  });
});

exports.getStakeLogs = Utils.catchAsync(async (req, res) => {
  try {
    const { address } = req.query;
    const results = await StakeModel.queryStakeLogsByAddress(address);

    res.status(200).json({
      status: 200,
      result: results,
      error: null
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      result: null,
      error: error.message
    });
  }
});

exports.saveStake = Utils.catchAsync(async (req, res) => {
  try {
    const { txid, address, amount, option } = req.body;

    if (!txid)
      throw new Error("Transaction is invalid");
    if (!address)
      throw new Error("Missing address");

    const stakeOptions = await StakeModel.queryAllStakeOptions();
    const selectedOption = stakeOptions.find(item => item.id === option);
    if (!selectedOption) {
      throw new Error("Staking option is invalid");
    }

    const result_check = await Utils.checkTransactionValidity(txid, address, amount);
    if (result_check.error) {
      throw new Error(result_check.error);
    }

    const results = await StakeModel.saveNewStake({ txid, address, amount, option });

    res.status(200).json({
      status: 200,
      result: results,
      error: null
    });
  } catch (error) {
    res.status(400).json({
      status: 400,
      result: null,
      error: error.message
    });
  }
});

// exports.swap = Utils.catchAsync(async (req, res) => {
//   try {
//     const { txid, address, amount } = req.body;

//     if (!txid)
//       throw new Error("Transaction is invalid");
//     if (!address)
//       throw new Error("Missing address");
//     if (!amount || amount < 1)
//       throw new Error("Invalid amount");

//     const result_check = await Utils.checkTransactionValidity(txid, address, amount, true);
//     if (result_check.error) {
//       throw new Error(result_check.error);
//     }
    
//     const hasTrustline = await checkNewTrustline(address);
//     if (!hasTrustline) throw new Error("Please set Trustline first");

//     await StakeModel.saveSwap({ txid, address, amount });

//     const tx_hash = await Utils.sendToken({
//       issuer: process.env.TOKEN_ISSUER,
//       tokenSymbol: process.env.TOKEN_SYMBOL,
//       tokenAmount: amount,
//       signer: Utils.getTreasuryWallet(),
//       toAddress: address
//     });

//     if (tx_hash) {
//       await StakeModel.updateSwap({ txid, tx_hash });
//     }

//     res.status(200).json({
//       status: 200,
//       result: true,
//       error: null
//     });
//   } catch (error) {
//     res.status(400).json({
//       status: 400,
//       result: null,
//       error: error.message
//     });
//   }
// });

exports. getStakePayload = Utils.catchAsync(async (req, res) => {
  const { address, amount, option, isMobile } = req.body;

  if (!address)
    throw new Error("Missing address");

  const stakeOptions = await StakeModel.queryPossibleStakeOptions();
  const selectedOption = stakeOptions.find(item => item.id === option);
  if (!selectedOption) {
    throw new Error("Staking option is invalid");
  }

  const tokens = await Utils.getBalance(address);
  let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);

  if (aax.length === 0) {
    aax = [{
      balance: 0,
      limit: 0
    }];
  }

  if (aax[0].balance < amount) {  
    return res.status(200).json({
      status: 200,
      result: null,
      error: "Insufficient balance."
    });
  }

  const payload = await XummController.getStakePayload(address, amount, selectedOption, isMobile);

  return res.status(200).json({
    status: 200,
    result: payload,
    error: null
  });
});

exports.getTrustline = Utils.catchAsync(async (req, res) => {
  try {
    const { address, isMobile } = req.body;

    if (!address)
      throw new Error("Missing address");

    const tokens = await Utils.getBalance(address);
    let payload;
    if(tokens.length < 0){
      payload = await XummController.getTrustlinePayload(address, isMobile);
    } else {
      const aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);
      if (aax.length > 0) {
        return res.status(200).json({
          status: 200,
          result: null,
          error: 'Your account have already AAX trustline'
        });
      }
      payload = await XummController.getTrustlinePayload(address, isMobile);
    }

    res.status(200).json({
      status: 200,
      result: payload,
      error: null
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      status: 400,
      result: null,
      error: error.message
    });
  }
});

exports.getSwapPayload = Utils.catchAsync(async (req, res) => {
  const { address, xrpAmt, aaxAmt, isMobile } = req.body;
  const swapAmount = parseFloat(xrpAmt* (10**6)).toFixed();
  const toAmount = aaxAmt;
  if (!address) {
    throw new Error("Missing address");
  }
  if (!swapAmount) {
    throw new Error("Invalid amount");
  }

  const accountInfo = await Utils.getAccountInfo(address);
  const xrpBalance = parseInt(accountInfo.result.account_data.Balance);

  if (swapAmount>xrpBalance) {
    throw new Error("Insufficient balance.");
  }

  const payload = await XummController.getSwapPayload(address, swapAmount, toAmount, isMobile);

  res.status(200).json({
    status: 200,
    result: payload,
    error: null
  });
});

const checkNewTrustline = async (address) => {
  const tokens = await Utils.getBalance(address);
  let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);

  return aax.length > 0;
}

exports.checkPendingStake = async () => {
  try {
    const results = await StakeModel.queryAllStakeLogs();

    if (results.length === 0) {
      console.log('No Stake logs found');
      return;
    }

    console.log("Pending stakings: ", results.length, "items are in stake.");

    for (const stake of results) {
      const now = moment().tz("Africa/Abidjan");
      const end = moment(stake.created_at).add(stake.duration, 'months').tz("Africa/Abidjan");
      const hasTrustline = await checkNewTrustline(stake.from_address);

      if (hasTrustline) {
        if (now.isAfter(end)) {
          const amount = stake.amount * (100 + stake.reward_percentage) / 100;

          const tx_hash = await Utils.sendToken({
            issuer: process.env.TOKEN_ISSUER,
            tokenSymbol: process.env.TOKEN_SYMBOL,
            tokenAmount: amount,
            signer: Utils.getTreasuryWallet(),
            toAddress: stake.from_address
          });

          if (tx_hash.success) {
            await StakeModel.updateStakeLog(stake.trx_hash, tx_hash.txHash, amount);
          } else {
            console.error("Error sending token:", tx_hash.error);
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}

exports.getTradeHistory = Utils.catchAsync(async (req, res) => {
  try {
    const { period } = req.query;
    const periods = {
      '1d': 24 * 60 * 60 * 1000, // 1 day in milliseconds
      '1w': 7 * 24 * 60 * 60 * 1000, // 1 week in milliseconds
      '1m': 30 * 24 * 60 * 60 * 1000, // 1 month (approx) in milliseconds
      '3m': 3 * 30 * 24 * 60 * 60 * 1000, // 3 months (approx) in milliseconds
      '6m': 6 * 30 * 24 * 60 * 60 * 1000, // 6 months (approx) in milliseconds
      '1y': 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
    };

    if (!Object.keys(periods).includes(period)) {
      return res.status(401).json({
        status: 401,
        result: null,
        error: 'Invalid parameter',
      });
    }

    const intervalMs = periods[period];

    const symbol = `${process.env.TOKEN_SYMBOL}%2B${process.env.TOKEN_ISSUER}%2FXRP`;
    const response = await fetch(`https://api.sologenic.org/api/v1/trades?symbol=${symbol}`);
    const bookOffers = await Utils.getBookOffers();
    const price = parseFloat(bookOffers[0].TakerPays) / parseFloat(bookOffers[0].TakerGets.value) / (10**6);
    if (response.status !== 200) {
      return res.status(500).json({
        status: 500,
        result: null,
        error: 'Internal server error',
      });
    }
    const data = await response.json();
    let ohlvc = [];
    if (data.length === 0) {
      return res.status(200).json({
        status: 200,
        result: {
          tradeHistory: [],
          ohlvc: ohlvc,
          latestPrice: 0,
        },
        error: null,
      });
    }
    const sortedTradeHistory = data.slice().sort((a, b) => new Date(a.executed_at) - new Date(b.executed_at));
    const ohlcvMap = new Map();
    const tradeHistory = [];
    const seenKeys = new Set();

    for (const trade of sortedTradeHistory) {
      const id = trade.id;
      if(!seenKeys.has(id)){
        seenKeys.add(id);
        tradeHistory.push(trade);
        const timestamp = new Date(trade.executed_at).getTime();
        const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs;

        const price = parseFloat(trade.price);
        const volume = parseFloat(trade.amount); // AAX traded

        if (!ohlcvMap.has(bucketTime)) {
          ohlcvMap.set(bucketTime, {
            time: bucketTime/1000,
            open: price,
            high: price,
            low: price,
            close: price,
            value: price,
            volume: volume,
          });
        } else {
          const ohlcv = ohlcvMap.get(bucketTime);
          ohlcv.high = Math.max(ohlcv.high, price);
          ohlcv.low = Math.min(ohlcv.low, price);
          ohlcv.close = price;
          ohlcv.value = price;
          ohlcv.volume += volume;
        }
      }
    }
    ohlvc = Array.from(ohlcvMap.values());
    return res.status(200).json({
      status: 200,
      result: {
        tradeHistory: tradeHistory,
        ohlvc: ohlvc,
        latestPrice: price
      },
      error: null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      result: null,
      error: error.message,
    });
  }
});

exports.getSwapConditions = Utils.catchAsync(async (req,res) => {
  try {
    const { address } = req.query;
    if (!address) {
      return res.status(401).json({
        status: 401,
        result: null,
        error: "Invalid address",
      });
    }

    const account_info = await Utils.getAccountInfo(address);
    let xrpBalance = 0;
    let errMsg;
    if (!account_info.error) {
      xrpBalance = account_info.result.account_data.Balance;
    } else {
      errMsg = account_info.error;
    }

    const accountBalance = await Utils.getBalance(address);
    const tokens = accountBalance.lines;
    let aax = tokens.filter(
      (token) =>
        token.currency === process.env.TOKEN_SYMBOL &&
        token.account === process.env.TOKEN_ISSUER
    );

    const checkTrustLine = aax.length > 0;
    return res.status(200).json({
      account: address,
      error: errMsg,
      result: {
        balance: xrpBalance,
        aax_balance: checkTrustLine ? aax[0].balance : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      result: null,
      error: error.message,
    });
  }
});