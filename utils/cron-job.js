const cron = require("node-cron");
// const Utils = require("../utils/utils.js");
const {checkPendingStake} =  require("../controllers/apiController.js");
const {checkRewardsState} = require("./utils.js");

cron.schedule("*/10 * * * *", async () => {
  checkPendingStake();
});

cron.schedule('0 0 1 * *', async () => {
  console.log('Running task on 1st of the month');
  await checkRewardsState();
});