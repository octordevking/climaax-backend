const cron = require("node-cron");
const Utils = require("../utils/utils.js");

cron.schedule("*/5 * * * *", async () => {
  // try {
  //   console.log("Starting to fetch all validated NFTs by cron-job");
  //   const issuerAddress = process.env.WALLET_ISSUER;
  //   await Utils.updateXRPNftListByContractId(issuerAddress);
  // } catch (error) {
  //   console.error("Error fetching all validated NFTs", error);
  // };
});