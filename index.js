const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'token.json';
var lastIdGmail = '';

//TELEGRAM
const TelegramBot = require('node-telegram-bot-api');
const token = '';
const bot = new TelegramBot(token, { polling: true });
var groupId;

//Bitmex
var bitmex = require("./bitmex");

//Ultimo precio del BTC
var lastBtcPrice = 0;
var timeBtc = "";
var stop = true;
var btcPrice = 0;

const BitMEXClient = require('bitmex-realtime-api');
// See 'options' reference below
const client = new BitMEXClient({
    testnet: false,
    apiKeyID: '',
    apiKeySecret: '',
    maxTableLen: 1
});

//MONGOOSE
var mongoose = require('mongoose');
var config = require('./config');
var Move = require('./models/move')
var move = new Move();

var emoji = require('node-emoji').emoji;

//lastMove
var lastMove = "";



// Load client secrets from a local file.
/*fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    authorize(JSON.parse(content), getRecentEmail);
});*/

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */


function getRecentEmail(auth) {
    // Only get the recent email - 'maxResults' parameter
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.messages.list({ auth: auth, userId: 'me', maxResults: 1, }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }

        // Get the message id which we will need to retreive tha actual message next.
        var message_id = response['data']['messages'][0]['id'];

        if (message_id != lastIdGmail) {

            lastIdGmail = message_id;
            // Retreive the actual message using the message id

            gmail.users.messages.get({ auth: auth, userId: 'me', 'id': message_id }, function(err, response) {

                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                }

                message_raw = response['data']['payload'].body.data;
                data = message_raw;
                buff = new Buffer(data, 'base64');
                text = buff.toString();
                gmailBody = text.split("\n");


                try {
                    gmailMessage = gmailBody.filter(item => item.indexOf("short") >= 0 || item.indexOf("long") >= 0 || item.indexOf("close") >= 0);

                    if (gmailMessage[1].indexOf("15min") >= 0) {
                        timeBtc = "15min"
                    } else if (gmailMessage[1].indexOf("30min") >= 0) {
                        timeBtc = "30min"
                    } else if (gmailMessage[1].indexOf("1hr") >= 0) {
                        timeBtc = "1hr"
                    }

                    //let btcPrice = Number(data[0].price.toString());
                    if (gmailMessage[1].indexOf("close") >= 0) {

                        if (gmailMessage[1].indexOf("long") >= 0) {

                            bot.sendMessage(groupId, `${emoji.loudspeaker} Close your long Position 
                                \n\n[XBTUSD] Price: ${btcPrice} \n\nProfit: ${ perecentage(lastBtcPrice, btcPrice)}% ${emoji.moneybag}`);
                            lastMove = "";

                        } else if (gmailMessage[1].indexOf("short") >= 0) {

                            bot.sendMessage(groupId, `${emoji.loudspeaker} Close your short Position \n\n[XBTUSD] Price: ${btcPrice} 
                                \n\nProfit: ${ -1*perecentage(lastBtcPrice, btcPrice)}% ${emoji.moneybag}`);
                            lastMove = "";
                        }

                    } else if (gmailMessage[1].indexOf("short") >= 0) {

                        if (lastMove.length != 0) {
                            closePosition(lastMove);
                        }
                        lastMove = "short";
                        lastBtcPrice = btcPrice;
                        setTimeout(() => {
                            bot.sendMessage(groupId, `${emoji.loudspeaker} Odin Bot Call 
                                \n\nOpen Position Bitmex contract [XBTUSD] \n\nPosition: short - ${btcPrice-1} ${emoji.chart_with_downwards_trend} 
                                \nTime Frame: ${timeBtc} ${emoji. alarm_clock}  
                                \n${emoji.dart}Target 1 (0.4%): ${(btcPrice - Number((btcPrice*0.004).toString().split(".")[0] ))}  
                                \n${emoji.dart}Target 2 (0.6%): ${(btcPrice - Number((btcPrice*0.006).toString().split(".")[0]))}  
                                \n${emoji.dart}Target 3 (0.8%): ${(btcPrice - Number((btcPrice*0.008).toString().split(".")[0]))} 
                                \n${emoji.no_entry} Remember to always mitigate risk by setting a stop loss`);
                        }, 3000);

                    } else if (gmailMessage[1].indexOf("long") >= 0) {

                        if (lastMove.length != 0) {
                            closePosition(lastMove);
                        }
                        lastMove = "long";
                        lastBtcPrice = btcPrice;
                        setTimeout(() => {
                            bot.sendMessage(groupId, `${emoji.loudspeaker} Odin Bot Call 
                                \n\nOpen Position Bitmex contract [XBTUSD] \n\nPosition: long - ${btcPrice+1} ${emoji.chart_with_upwards_trend} 
                                \nTime Frame: ${timeBtc} ${emoji. alarm_clock}  
                                \n${emoji.dart}Target 1 (0.4%): ${(btcPrice + Number((btcPrice*0.004).toString().split(".")[0] ))}  
                                \n${emoji.dart}Target 2 (0.6%): ${(btcPrice + Number((btcPrice*0.006).toString().split(".")[0]))}  
                                \n${emoji.dart}Target 3 (0.8%): ${(btcPrice + Number((btcPrice*0.008).toString().split(".")[0]))} 
                                \n${emoji.no_entry} Remember to always mitigate risk by setting a stop loss`);
                        }, 3000);
                    }

                    updateObjBd();


                } catch (error) {
                    console.error(error);
                }


            });
        }

    });
}

function closePosition(lastMove) {
    if (lastMove == "long") {
        bot.sendMessage(groupId, `${emoji.loudspeaker} Close your long Position`);
    } else {
        bot.sendMessage(groupId, `${emoji.loudspeaker} Close your short Position`);
    }
}

function perecentage(lastBtcPrice, newBtcPrice) {
    let calc = (newBtcPrice - lastBtcPrice) / lastBtcPrice
    return (calc * 100).toFixed(2);

}

function updateObjBd() {
    move.gmailId = lastIdGmail;
    move.price = lastBtcPrice;
    move.lastMove = lastMove;
    move.save();
}







mongoose.connect(config.db, function(err) {

    Move.find({}, (err, moves) => {
            if (moves) {
                move = moves[0];
                lastBtcPrice = moves[0].price;
                lastIdGmail = moves[0].gmailId;
                lastMove = moves[0].lastMove;
            }

            groupId = -1001188997673;

            client.addStream('XBTUSD', 'instrument', function(data, symbol, tableName) {
                btcPrice = Number(data[0].lastPriceProtected.toString().split(".")[0]);
                fs.readFile('credentials.json', (err, content) => {
                    if (err) return console.log('Error loading client secret file:', err);
                    authorize(JSON.parse(content), getRecentEmail);
                });
            });
        })
        //prueba
});