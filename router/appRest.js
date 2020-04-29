const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
var https = require('https');
var http = require('http');
var fs = require('fs');
var redis = require('redis');
var LOG = require('./log/logger')
var literals = require('./config/literals')
var config = require('./config/config')
var chatflow = require('./config/chatflow')
var RasaCoreController = require('./controllers/rasaCoreController')
var EDB = require('./api/elastic/connection')
const telemetryHelper = require('./api/telemetry/telemetry.js')
const axios                 = require('axios')
const parser = require('ua-parser-js')


const appBot = express()
//cors handling
appBot.use(cors());
//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// Redis is used as the session tracking store
const redis_client = redis.createClient(config.REDIS_PORT, config.REDIS_HOST);
const chatflowConfig = chatflow.chatflow;

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	handler(req, res, 'botclient')
})

appBot.post('/bot/whatsapp', function (req, res) {
	handler(req, res, 'whatsapp')
})

appBot.post('/bot/telegram', function (req, res) {
	handler(req, res, 'telegram')
})

function handler(req, res, channel) {
	var body = req.body.Body
	var sessionID = req.body.From;
	let uaspec = getUserSpec(req);
	var userData = {};
	data = { message: body, customData: { userId: sessionID } }
	LOG.info('context for: ' + sessionID)
	//persisting incoming data to EDB
	//dataPersist = {'message': body, 'channel' : 'rest'}
	//EDB.saveToEDB(dataPersist, 'user', sessionID,(err,response)=>{})
	if (!sessionID) {
		sendResponse(sessionID, res, "From attrib missing", 400);
	} else {
		redis_client.get(sessionID, (err, redisValue) => {
			if (redisValue != null) {
				// Key is already exist and hence assiging data which is already there at the posted key
				userData = JSON.parse(redisValue);
				// all non numeric user messages go to bot
				if (isNaN(body)) {
					///Bot interaction flow
					RasaCoreController.processUserData(data, sessionID, (err, resp) => {
						if (err) {
							sendChannelResponse(sessionID, res, 'SORRY', channel)
						} else {
							let responses = resp.res;
							for (var i = 0; i < responses.length; i++) {
								const telemetryData = { 
									userData: data,
									uaspec: uaspec,
									step: 'START_CONVERSATION',
									stepResponse: responses[i].text 
								}
								telemetryHelper.logInteraction(telemetryData)
								sendResponse(sessionID, res, responses[i].text)
							}
						}
					})
				} else {
					var currentFlowStep = userData.currentFlowStep;
					var possibleFlow = currentFlowStep + '_' + body;
					if (chatflowConfig[possibleFlow]) {
						var respVarName = chatflowConfig[currentFlowStep].responseVariable;
						if (respVarName) {
							userData[respVarName] = body;
						}
						currentFlowStep = possibleFlow;
					} else if (body === '0') {
						currentFlowStep = 'step1'
					} else if (body === '99') {
						if (currentFlowStep.lastIndexOf("_") > 0) {
							currentFlowStep = currentFlowStep.substring (0, currentFlowStep.lastIndexOf("_"))
						}
					}
					userData['currentFlowStep'] = currentFlowStep;
					setRedisKeyValue(sessionID, userData);
					const telemetryData = { 
						userData: data,
						uaspec: uaspec,
						step: chatflowConfig[currentFlowStep].messageKey,
						stepResponse: literals.message[chatflowConfig[currentFlowStep].messageKey] 
					}
					telemetryHelper.logInteraction(telemetryData)
					sendChannelResponse(sessionID, res, chatflowConfig[currentFlowStep].messageKey, channel);
				}

			} else {
				// Implies new user. Adding data in redis for the key and also sending the WELCOME message
				userData = { sessionId: sessionID, currentFlowStep: 'step1' };
				setRedisKeyValue(sessionID, userData);
				const telemetryData = { 
					userData: data,
					step: chatflowConfig['step1'].messageKey,
					stepResponse: literals.message[chatflowConfig['step1'].messageKey] 
				}
				telemetryHelper.logInteraction(telemetryData);
				sendChannelResponse(sessionID, res, 'START', channel);
			}
		});
	}
}

function setRedisKeyValue(key, value) {
	const expiryInterval = 3600;
	redis_client.setex(key, expiryInterval, JSON.stringify(value));
}

/**
* This function helps to get user spec
*/
function getUserSpec(req) {
    var ua = parser(req.headers['user-agent'])
    return {
      'agent': ua['browser']['name'],
      'ver': ua['browser']['version'],
      'system': ua['os']['name'],
      'platform': ua['engine']['name'],
      'raw': ua['ua']
    }
}

function delRedisKey(key) {
	redis_client.del(key);
}

//send data to user
function sendResponse(sessionID, response, responseBody, responseCode) {
	response.set('Content-Type', 'text/plain')
	if (responseCode) response.status(responseCode)
	response.send(responseBody)
}

function sendChannelResponse(sessionID, response, responseKey, channel, responseCode) {
	response.set('Content-Type', 'text/plain')
	var tmp = literals.message
	if (responseCode) response.status(responseCode)
	var channelResponse = literals.message[responseKey + '_' + channel];
	if (channelResponse) {
		response.send(channelResponse)	
	} else {
		response.send(literals.message[responseKey])	
	} 
}

//http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
	if (err) {
		throw err
	}
	LOG.info('Server started on port ' + config.REST_HTTP_PORT)
	telemetryHelper.initializeTelemetry()
});

LOG.info('HTTPS port value ' + config.HTTPS_PATH_KEY)
//https endpoint only started if you have updated the config with key/crt files
if (config.HTTPS_PATH_KEY) {
	//https certificate setup
	var options = {
		key: fs.readFileSync(config.HTTPS_PATH_KEY),
		cert: fs.readFileSync(config.HTTPS_PATH_CERT),
		ca: fs.readFileSync(config.HTTPS_PATH_CA)
	};

	https.createServer(options, appBot).listen(config.REST_HTTPS_PORT, function (err) {
		if (err) {
			throw err
		}
		LOG.info('Server started on port ' + config.REST_HTTPS_PORT)
	});

}
