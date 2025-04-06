const xrpl = require('xrpl');
const Config = require('./config');
const { response } = require('express');
const {getExistingNftsIds, updateBurnedNfts, insertNfts, getPointsByTaxonId, getPointsArrayOfSgb} = require('../models/nftModel');
const { Client } = xrpl;
const client = new Client(Config.XRP_RPC);

async function connectClient() {
  if (!client.isConnected()) {
    try {
      await client.connect();
      // await exports.updateXRPNftListByIssuer(process.env.WALLET_ISSUER);
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
  try {
    const balances = await client.request({
      command: "account_lines",
      account: address,
      ledger_index: "validated"
    });

    return balances.result;
  } catch (error) {
    console.error("Error fetching account balances:", error);
    throw new Error("Failed to fetch account balances");
  }
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

const getNftsOfAccount = async (accountAddress) => {
  try {
    console.log("Fetching NFTs of account: ", accountAddress);
    const nftLists = await client.request({
      command: "account_nfts",
      account: accountAddress,
      ledger_index: "validated",
    });
    
    return nftLists.result.account_nfts
  } catch (err){
    throw new Error(err.message);
  }
}

const fetchAllVaidatedNfts = async (issuerAddress) =>{
  try { 
    let allNFTs = [];
    let marker = null;

    do {
      const requestBody = {
        command: "nfts_by_issuer",
        issuer: issuerAddress,
        ledger_index: "validated"
      }

      if (marker) {
        requestBody.marker = marker;
      }

      const res = await client.request(requestBody);
      allNFTs.push(...res.result.nfts);
      
      marker = res.result.marker ||  null;
    } while (marker);
    
    return allNFTs
  } catch (err) {
    console.error("Error fetching NFTs", err);
    return [];
  }
};

exports.updateXRPNftListByIssuer = async (issuerAddress) => {
  try{ 
    const nfts = await fetchAllVaidatedNfts(issuerAddress);
    if (nfts.length === 0) return;
    const existingNFTsIds = await getExistingNftsIds();
    const newNfts = nfts.filter(nft => !existingNFTsIds.includes(nft.nft_id)); 
    await insertNfts(newNfts);
    const burnedNftIds = nfts.filter(nft => nft.is_burned).map(nft => nft.nft_id);
    await updateBurnedNfts(burnedNftIds);
  } catch (err) {
    console.error("Error updating NFTs", err);
  }
};

exports.getVerifiedNftsOfAccount = async (accountAddress) => {
  try {
    const [nftLists, taxonPoints] = await Promise.all([
      getNftsOfAccount(accountAddress),
      getPointsByTaxonId()
    ]);

    if (!nftLists){ 
      return {
        account: accountAddress,
        account_nfts: [],
        error: "No NFTs found owned by this account"
      };
    };

    const nfts = nftLists.map((nft) => {
      const taxonId = nft.NFTokenTaxon;
      const points = taxonPoints[taxonId]; 
      const isVerified = points !== undefined;
      return {
        nft_id: nft.NFTokenID,
        uri: nft.URI,
        nft_taxon: taxonId,
        points: points,
        isVerified: isVerified,
      }
    });

    const { totalPoints, basePoints, bonusPoints } = await calculateXRPNftPoints(nfts);
    return {
      account: accountAddress,
      account_nfts: nfts,
      calculatedPoints:{
        totalPoints: totalPoints,
        basePoints: basePoints,
        bonusPoints: bonusPoints
      },
      error: null
    }
  } catch (err){
    console.error("Error fetching NFTs of account", err);
    throw new Error(err.message);
  }
};

const calculateXRPNftPoints = async (nfts) => {
  let basePoints = 0;
  let toyboxPoints = 0;
  let totalPoints = 0;
  let toyboxTaxonSet = new Set();
  let xrplcTaxonSet = new Set();

  for (const nft of nfts){
    if (!nft.isVerified) continue;
    basePoints += parseFloat( nft.points);
    
    if (Config.TOYBOX_TAXONS.has(nft.nft_taxon)){
      toyboxPoints += nft.points;
      if (!toyboxTaxonSet.has(nft.nft_taxon)){
        toyboxTaxonSet.add(nft.nft_taxon);
      }
    }

    if (Config.XRPLC_TAXONS.has(nft.nft_taxon)){
      if (!xrplcTaxonSet.has(nft.nft_taxon)){
        xrplcTaxonSet.add(nft.nft_taxon);
      }
    }
  }
  let toyboxBonus = 0;
  if (areSetsEqual(Config.TOYBOX_TAXONS, toyboxTaxonSet)){
    toyboxBonus = Config.TOYBOX_TAXONS.size + toyboxPoints * 0.05; //Owning a set of AA toyboxes grants you +1 point per toybox in the set +5% extra points
  }

  let xrplcBonus = 0;
  if (areSetsEqual(Config.XRPLC_TAXONS, xrplcTaxonSet)){ 
    xrplcBonus = basePoints * 0.1; //Owning a set of AA toyboxes grants you +1 point per toybox in the set +5% extra points
  }

  totalPoints = basePoints + toyboxBonus + xrplcBonus;

  return {
    totalPoints: totalPoints,
    basePoints: basePoints,
    bonusPoints: { 
      toyboxBonus: toyboxBonus,
      xrplcBonus: xrplcBonus
    },
  }
};

function areSetsEqual(set1, set2) {
  // Check if both sets have the same size
  if (set1.size !== set2.size) {
      return false;
  }
  
  // Check if every element in set1 exists in set2
  for (let item of set1) {
      if (!set2.has(item)) {
          return false;
      }
  }
  
  return true; // Sets are equal if all checks pass
}

const getSgbNftsOfAccount = async (accountAddress) => {
  try {
    const res = await fetch(`https://songbird-explorer.flare.network/api/v2/addresses/${accountAddress}/nft?type=ERC-721%2CERC-404%2CERC-1155`);
    const data = await res.json();
    // console.log("SGB NFTs of account: ", data.items);
    return data.items;
  } catch (error){
    console.error("Error fetching SGB nfts by owner address", error);
    return [];
  }
};

exports.fetchAllValidatedSgbNfts = async (issuerAddress) => {
  try{

  } catch (error){
    console.error("Error fetching All Validated SGB Nfts", error);
  }
};

exports.getVerifiedSgbNftsOfAccount = async (accountAddress) => {
  try{
    const [nftList, pointsData] = await Promise.all([
      getSgbNftsOfAccount(accountAddress),
      getPointsArrayOfSgb(),
    ]);

    if (!nftList){
      return {
        account: accountAddress,
        account_nfts: [],
        error: "No NFTs found owned by this account"
      };
    };
    const nfts = nftList.map( (nft) => {
      const contract_address = nft.token.address.toLowerCase();
      const nft_id = nft.id;
      const image_url = nft.image_url;
      let match;
      let nft_name;
      const nft_collection_name = nft.token.name;
      if (nft.token.symbol == "AASGB"){
        nft_name = nft.token.name;
        match =  pointsData.find(sql =>
          sql.contract_address == contract_address 
        );
      } else {
        nft_name = nft.metadata.name;
        match =  pointsData.find(sql =>
          sql.contract_address == contract_address && sql.nft_id == nft_id
        );
      }
      const points = match ? match.points : 0;
      const abbreviation = match ? match.abbreviation : undefined;
      const isVerified = match !== undefined;
      return {
        contract_address: contract_address,
        nft_id: nft_id,
        image_url: image_url,
        name: nft_name,
        points: points,
        isVerified: isVerified,
        collection_name: nft_collection_name,
        abbreviation: abbreviation
      }
    });

    const { totalPoints, basePoints, bonusPoints } = await calculateSGBNftPoints(nfts);
    return {
      account: accountAddress,
      account_nfts: nfts,
      calculatedPoints:{
        totalPoints: totalPoints,
        basePoints: basePoints,
        bonusPoints: bonusPoints
      },
      error: null
    }
  } catch (error){
    console.error("Error fetching verified SGB Nfts by owner address");
  }
};

const calculateSGBNftPoints = async (nfts) => {
  let basePoints = 0;
  let totalPoints = 0;
  let bonusPoints = 0;
  let masterpiecePoints = 0;
  let collectiblePoints = 0;
  let collectibleCount = 0;
  let toyboxPoints = 0;
  let toyboxCount = 0;

  const ownedAbbs = new Set();
  if(nfts.length === 0) return {
    totalPoints: 0,
    basePoints: 0,
    bonusPoints: 0
  };

  for (const nft of nfts){
    if (!nft.isVerified ) continue;
    const abb = nft.abbreviation;
    const points =parseFloat(nft.points);
    ownedAbbs.add(abb);
    basePoints += points;

    if (Config.TOYBOX_ABB_SGB.has(abb)){
      toyboxPoints += points;
      toyboxCount ++;
    } else if (Config.MASTERPIECES_ABB_SGB.has(abb)){
      masterpiecePoints += points;
    } else if (Config.SGB_COLLECTIBLE_ABB.has(abb)){
      collectiblePoints += points;
      collectibleCount++;
    }
  }

  const toyboxBonus = toyboxCount + (0.05 * toyboxPoints);

  const sets = [
    new Set(['AR', 'FS']),
    new Set(['SS', 'BP']),
    new Set(['X', 'R', 'P', 'L', 'LIS']),
  ];
  let masterpieceBonus = 0;
  sets.forEach(set => {
      if ([...set].every(item => ownedAbbs.has(item))) {
          masterpieceBonus += 0.5;
      }
  });
  masterpiecePoints += masterpieceBonus;
  const totalBeforeBonus = toyboxPoints + toyboxBonus + masterpiecePoints + collectiblePoints;

  const hasCollectionBonus =
    toyboxCount > 0 &&
    collectibleCount > 0 &&
    [...Config.MASTERPIECES_ABB_SGB].some(abb => ownedAbbs.has(abb));

  const collectionBonus = hasCollectionBonus ? totalBeforeBonus * 0.10 : 0;

  const finalTotal = totalBeforeBonus + collectionBonus;
  return {
    totalPoints: finalTotal,
    basePoints: basePoints,
    bonusPoints: toyboxBonus + collectionBonus + masterpieceBonus,
  };
}

exports.updateSGBNftListByIssuer = async (issuerAddress) => {
  try{

  } catch (error) {
    console.error("Error updating SGB NFT list to db", error)
  }
};

