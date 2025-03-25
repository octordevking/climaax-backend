const xrpl = require('xrpl');
const Config = require('./config');
const { Client } = xrpl;
const client = new Client(Config.XRP_RPC);

async function connectClient() {
  if (!client.isConnected()) {
    try {
      await client.connect();
      console.log("Successfully connected to the XRPL WebSocket server.");
    } catch (error) {
      console.error(`Connection failed: ${error.message}`);
      setTimeout(connectClient, 500);
    }
  }
}

connectClient().catch(console.error);

client.on('error', (errorCode, errorMessage) => {
  console.error(`WebSocket Error: ${errorCode} - ${errorMessage}`);
});

client.on('disconnected', (code) => {
  console.log(`Disconnected from XRPL WebSocket server with code: ${code}`);
  setTimeout(connectClient, 1000);
});

let lastUsedTag = 0;

function getNextDestinationTag() {
  lastUsedTag += 1;
  return lastUsedTag;
}

exports.catchAsync = (func) => {
  return async (req, res) => {
    try {
      await func(req, res);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: 500,
        result: null,
        error: error.message
      });
    }
  };
};

exports.getTreasuryWallet = () => {
  const { Wallet } = xrpl;
  return Wallet.fromSeed(process.env.TREASURY_SEED);
}

exports.getIssuerWallet = () => {
  const { Wallet } = xrpl;
  return Wallet.fromSeed(process.env.ISSUER_SEED);
}

// DESC: hot_wallet requests `tokenAmount` of `tokenSymbol` from `issuer`
exports.setTrustLine = async ({ issuer, tokenSymbol, tokenAmount }) => {
  const hot_wallet = this.getTreasuryWallet();

  const trust_set_tx = {
    TransactionType: "TrustSet",
    Account: hot_wallet.address,
    LimitAmount: {
      currency: tokenSymbol,
      issuer: issuer,
      value: tokenAmount.toString() // Large limit, arbitrarily chosen
    }
  }

  const ts_prepared = await client.autofill(trust_set_tx)
  const ts_signed = hot_wallet.sign(ts_prepared)
  console.log("Creating trust line from hot address to issuer...")
  const ts_result = await client.submitAndWait(ts_signed.tx_blob)
  
  if (ts_result.result.meta.TransactionResult == "tesSUCCESS") {
    console.log(`Transaction succeeded: https://xrpscan.com/tx/${ts_signed.hash}`)
    return true;
  } else {
    console.log(`Error sending transaction: ${ts_result.result.meta.TransactionResult}`)
  }
}

// DESC: signer wallet sends `tokenAmount` of `tokenSymbol` minted by `issuer` to `toAddress`
exports.sendToken = async ({ issuer, tokenSymbol, tokenAmount, signer, toAddress }) => {
  const amount = (tokenAmount * 1000000).toFixed(0) / 1000000;

  const send_token_tx = {
    TransactionType: "Payment",
    Account: signer.address,
    Destination: toAddress,
    DestinationTag: getNextDestinationTag(),
    Amount: {
      currency: tokenSymbol,
      value: amount.toString(),
      issuer: issuer
    },
  }

  const pay_prepared = await client.autofill(send_token_tx)
  const pay_signed = signer.sign(pay_prepared)

  console.log(`Sending ${tokenAmount} ${tokenSymbol} to ${toAddress}...`)
  const pay_result = await client.submitAndWait(pay_signed.tx_blob)

  if (pay_result.result.meta.TransactionResult == "tesSUCCESS") {
    console.log(`Transaction succeeded: https://xrpscan.com/tx/${pay_signed.hash}`)
    return pay_signed.hash;
  } else {
    console.log(`Error sending transaction: ${pay_result.result.meta.TransactionResult}`)
    return null;
  }
}

exports.getBalance = async (address) => {
  const balances = await client.request({
    command: "account_lines",
    account: address,
    ledger_index: "validated"
  })

  return balances.result
}

exports.checkTransactionValidity = async (transactionId, fromAddress, amount, old) => {
  try {
    const tx = await client.request({
      command: 'tx',
      transaction: transactionId,
    })

    const tran_type = tx.result.TransactionType;
    const tran_from_address = tx.result.Account;
    const tran_to_address = tx.result.Destination;
    const tran_hash = tx.result.hash;
    const tran_valid = tx.result.validated;
    const tran_status = tx.result.meta.TransactionResult;
    const tran_symbol = tx.result.Amount.currency;
    const tran_issuer = tx.result.Amount.issuer;
    const tran_amount = tx.result.Amount.value;
    const tran_fee = tx.result.Fee;
    const tran_date = new Date(tx.result.date);

    const issuer = old ? process.env.OLD_TOKEN_ISSUER : process.env.TOKEN_ISSUER;

    if (
      tran_valid &&
      tran_type === "Payment" &&
      tran_hash === transactionId &&
      tran_from_address === fromAddress &&
      tran_to_address === process.env.TREASURY_ACCOUNT &&
      tran_symbol === process.env.TOKEN_SYMBOL &&
      tran_issuer === issuer &&
      tran_amount.toString() === amount.toString() &&
      tran_status === "tesSUCCESS"
    ) {
      return {
        error: null,
        result: {
          transaction_id: tran_hash,
          from_address: tran_from_address,
          to_address: tran_to_address,
          amount: {
            currency: tran_symbol,
            isser: tran_issuer,
            value: amount
          },
          fee: tran_fee,
          datetime: tran_date
        }
      }
    } else {
      console.log("tx.result", tx.result)
      return {
        error: "Transaction is invalid",
        result: null
      }
    }
  } catch (error) {
    console.log(error)
    throw error;
  }
};