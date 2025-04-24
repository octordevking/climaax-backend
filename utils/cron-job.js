const cron = require("node-cron");
// const Utils = require("../utils/utils.js");
const {checkPendingStake} =  require("../controllers/apiController.js");

cron.schedule("*/5 * * * *", async () => {
  checkPendingStake();
});