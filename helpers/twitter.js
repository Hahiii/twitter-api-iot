
const https = require("https");
const moment = require('moment');
let token;

const secrets = process.env.NODE_ENV == 'production' ? process.env : require('../secrets');

/** HttpsRequest to Twitter API and returns a new promise
 * @param {object} option Request params
 * 
 * @returns {Promise} promise with the parsedData from Twitter API
*/
const promisifyHttpsRequest = (options) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (response) => {
            if (response.statusCode != 200) {
                reject(response.statusCode)
                return;
            }

            let body = "";
            response
                .on("data", (chunk) => {
                    body += chunk;
                })
                .on("end", () => {
                    let parsedData = JSON.parse(body)
                    resolve(parsedData);
                })
        });

        req.end("grant_type=client_credentials")
    });
};

/** Get bearerToken from Twitter API /oauth2/token gets called conce
 * 
 * @returns {string} a bearerToken to be passed in getTweets();
*/
const getToken = () => {
    let credentials = `${secrets.consumerKey}:${secrets.consumerSecret}`;
    let encodedCredentials = Buffer.from(credentials).toString("base64");
    const option = {
        host: "api.twitter.com",
        path: "/oauth2/token",
        method: "POST",
        headers: {
            Authorization: `Basic ${encodedCredentials}`,
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        }
    }
    return promisifyHttpsRequest(option);
};

/** Get Tweets from Twitter API 
 * 
 * @param {string} bearerToken returned from getToken()
 * @param {string} next queryParam for the next page;
 * 
 * @returns {Object} object of tweets from Twitter API
*/
const getTweets = (bearerToken, next = '') => {
    const path = `/1.1/search/tweets.json`;
    const queryParams = next ? next : `?q=%23IoT&result_type=recent&count=100`;

    const option = {
        host: "api.twitter.com",
        path: `${path}${queryParams}`,
        method: "GET",
        headers: {
            Authorization: `${bearerToken.token_type} ${bearerToken.access_token}`,
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        }
    }

    return promisifyHttpsRequest(option);
};


/** Filter Tweets to get the Count 
 * 
 * @param {Array}  tweets array containing the tweets;
 * @param {Object}  date object of start & end time in utc format;
 * 
 * @returns {Array} with the filterted tweets between start and end time;
*/
const filterTweetsCount = (tweets, date) => {
    let currentHour = date.currentHour;
    let startHour = date.startHour;

    let data = tweets.filter(items => {
        let tweetHour = moment.utc(new Date(items.created_at).toISOString());

        if (tweetHour.isBetween(startHour, currentHour, 'minutes', '[]')) {
            return items
        }
    });
    return data;
};


/** Filter Tweets to get the user count
 * 
 * @param {Array}  tweets array containing the tweets;
 * @param {Object}  date  object of start & end time in utc format;
 * 
 * @returns {Array} of filterted user id;
*/
const filterTweetsUsers = (tweets, date) => {
    let data = filterTweetsCount(tweets, date)
    let userObj = {};

    data.filter(items => {
        if (!userObj.hasOwnProperty(items.user.id)) {
            userObj[items.user.id] = items.user.id;
            return userObj
        }
    });
    return Object.keys(userObj);
};


/** Get Tweets Data
 * @async
 * @param {string} startHourt in utc format;
 * 
 * @returns {Array} array of all the tweets created after the startHourt;
*/

const getTweetsData = async (startHour) => {
    if (!token) {
        token = await getToken();
    }

    let tweets = await getTweets(token);
    let nextPage = tweets.search_metadata.next_results;
    tweets = tweets.statuses;
    let lastItem = tweets[tweets.length - 1];
    let lastItemDate = moment.utc(new Date(lastItem.created_at).toISOString());

    /** as long as the last item created_at is after start time, 
     * we request next page from Twitter API
    */ 
    while (lastItemDate.isAfter(startHour)) {
        lastItem = tweets[tweets.length - 1];
        lastItemDate = moment.utc(new Date(lastItem.created_at).toISOString());

        let newTweets = await getTweets(token, nextPage)
        nextPage = newTweets.search_metadata.next_results;
        newTweets = newTweets.statuses;
        tweets = tweets.concat(newTweets);
    }
    return tweets;
};


module.exports = {
    getTweetsData,
    filterTweetsUsers,
    filterTweetsCount,
};