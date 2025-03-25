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
  const { address } = req.query;
  const results = await StakeModel.queryStakeLogsByAddress(address);

  res.status(200).json({
    status: 200,
    result: results,
    error: null
  });
});

exports.saveStake = Utils.catchAsync(async (req, res) => {
  const { txid, address, amount, option } = req.body;

  if (!txid)
    throw new Error("Transaction is invalid");
  if (!address)
    throw new Error("Missing address");
  if (!amount || amount < 100 || amount > 1000000)
    throw new Error("Invalid amount");

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
});

exports.swap = Utils.catchAsync(async (req, res) => {
  const { txid, address, amount } = req.body;

  if (!txid)
    throw new Error("Transaction is invalid");
  if (!address)
    throw new Error("Missing address");
  if (!amount || amount < 1)
    throw new Error("Invalid amount");

  const result_check = await Utils.checkTransactionValidity(txid, address, amount, true);
  if (result_check.error) {
    throw new Error(result_check.error);
  }
  
  const hasTrustline = await checkNewTrustline(address);
  if (!hasTrustline) throw new Error("Please set Trustline first");

  await StakeModel.saveSwap({ txid, address, amount });

  const tx_hash = await Utils.sendToken({
    issuer: process.env.TOKEN_ISSUER,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    tokenAmount: amount,
    signer: Utils.getTreasuryWallet(),
    toAddress: address
  });

  if (tx_hash) {
    await StakeModel.updateSwap({ txid, tx_hash });
  }

  res.status(200).json({
    status: 200,
    result: true,
    error: null
  });
});

exports.getStakePayload = Utils.catchAsync(async (req, res) => {
  const { address, amount, option, isMobile } = req.body;

  if (!address)
    throw new Error("Missing address");

  if (!amount || amount < 10 || amount > 1000000)
    throw new Error("Invalid amount");

  const stakeOptions = await StakeModel.queryPossibleStakeOptions();
  const selectedOption = stakeOptions.find(item => item.id === option);
  if (!selectedOption) {
    throw new Error("Staking option is invalid");
  }

  const accountBalance = await Utils.getBalance(address);
  const tokens = accountBalance.lines;
  let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);

  if (aax.length === 0) {
    aax = [{
      balance: 0,
      limit: 0
    }];
  }

  if (aax[0].balance > accountBalance) {
    throw new Error("Insufficient balance.");
  }

  const payload = await XummController.getStakePayload(address, amount, selectedOption, isMobile);

  res.status(200).json({
    status: 200,
    result: payload,
    error: null
  });
});

exports.getTrustline = Utils.catchAsync(async (req, res) => {
  const { address, isMobile } = req.body;

  if (!address)
    throw new Error("Missing address");

  const accountBalance = await Utils.getBalance(address);
  const tokens = accountBalance.lines;
  let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);

  if (aax.length > 0) {
    res.status(200).json({
      status: 200,
      result: null,
      error: null
    });
    return;
  }

  const payload = await XummController.getTrustlinePayload(address, isMobile);

  res.status(200).json({
    status: 200,
    result: payload,
    error: null
  });
});

exports.getSwapPayload = Utils.catchAsync(async (req, res) => {
  const { address, amount, isMobile } = req.body;

  if (!address)
    throw new Error("Missing address");

  if (!amount || amount < 1)
    throw new Error("Invalid amount");

  const accountBalance = await Utils.getBalance(address);
  const tokens = accountBalance.lines;
  let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.OLD_TOKEN_ISSUER);

  if (aax.length === 0) {
    aax = [{
      balance: 0,
      limit: 0
    }];
  }

  if (aax[0].balance > accountBalance) {
    throw new Error("Insufficient balance.");
  }

  const payload = await XummController.getSwapPayload(address, amount, isMobile);

  res.status(200).json({
    status: 200,
    result: payload,
    error: null
  });
});

const checkNewTrustline = async (address) => {
  const accountBalance = await Utils.getBalance(address);
  const tokens = accountBalance.lines;
  let aax = tokens.filter(token => token.currency === process.env.TOKEN_SYMBOL && token.account === process.env.TOKEN_ISSUER);

  return aax.length > 0;
}

const checkPendingStake = async () => {
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

          if (tx_hash) {
            await StakeModel.updateStakeLog(stake.trx_hash, tx_hash, amount);
          }
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}

exports.runRewardProcessing = async () => {
  setTimeout(async () => {
    await checkPendingStake();
    this.runRewardProcessing();
  }, 1000 * 60);
};