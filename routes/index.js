const express = require('express');
const router = express.Router();
const moment = require('moment');
const { getTweetsData, filterTweetsCount, filterTweetsUsers } = require("../helpers/twitter");

let result;

/** GET number of tweets about #IoT in the last hour. 
 * @async  
*/
router.get('/count', async (req, res, next) => {
  let currentHour = moment.utc().format();
  let startHour = moment.utc().subtract(1, 'hours').format();
  try {
    let tweets = await getTweetsData(startHour)
    result = filterTweetsCount(tweets, { currentHour, startHour });
    res.json({
      data: {
        text: `There have been ${result.length} tweets about #IoT in the last hour`,
        count: result.length,
        from: moment(startHour).format('LT'),
        to: moment(currentHour).format('LT'),
      }
    });
  } 
  /** 
   * @throws Will throw an error if getTweetsData errors out.
   */
  catch (error) {
    console.log(error);
    res.json({
      data: {
        error: `There was an ${error} getting the data`,
      }
    });
  }
});


/** GET number of users tweeting about #IoT in the last hour.
 * @async
*/
router.get('/users-count', async (req, res, next) => {
  let currentHour = moment.utc().format();
  let startHour = moment.utc().subtract(1, 'hours').format();
  try {
    let tweets = await getTweetsData(startHour)
    result = filterTweetsUsers(tweets, { currentHour, startHour });

    res.json({
      data: {
        text: `There have been ${result.length} users tweeting about #IoT in the last hour`,
        count: result.length,
        from: moment(startHour).format('LT'),
        to: moment(currentHour).format('LT'),
      }
    });
  } 
  /** 
   * @throws Will throw an error if getTweetsData errors out.
   */
  catch (error) {
    console.log(error);
    res.json({
      data: {
        error: `There was a ${error};`,
      }
    });
  }
});

module.exports = router;
