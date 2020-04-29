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
const apiToken = config.PORTAL_API_AUTH_TOKEN
const appBot = express()
//cors handling
appBot.use(cors());
//body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }))

// Redis is used as the session tracking store
const redis_client = redis.createClient(config.REDIS_PORT, config.REDIS_HOST);
const chatflowConfig = chatflow.chatflow;
var deviceId = ''
var appId = ''
var channelId = ''

// Route that receives a POST request to /bot
appBot.post('/bot', function (req, res) {
	deviceId  = req.headers['x-device-id'];
	appId     = req.headers['x-app-id'];
	channelId = req.headers['x-channel-id'];
	var data = {
		deviceId: deviceId,
		channelId: channelId, 
		appId: appId,
		pid: 'botclient',
		apiToken: apiToken
	}
	telemetryHelper.initializeTelemetry(data)
	handler(req, res, 'botclient')
})

appBot.post('/bot/whatsapp', function (req, res) {
	deviceId  = req.headers['x-device-id'];
	appId     = req.headers['x-app-id'];
	channelId = req.headers['x-channel-id'];
	var data = {
		deviceId: deviceId,
		channelId: channelId, 
		appId: appId,
		pid: 'whatsapp',
		apiToken: apiToken
	}
	telemetryHelper.initializeTelemetry(data)
	handler(req, res, 'whatsapp')
})

appBot.post('/bot/telegram', function (req, res) {
	deviceId  = req.headers['x-device-id'];
	appId     = req.headers['x-app-id'];
	channelId = req.headers['x-channel-id'];
	var data = {
		deviceId: deviceId,
		channelId: channelId, 
		appId: appId,
		pid: 'telegram',
		apiToken: apiToken
	}
	telemetryHelper.initializeTelemetry(data)
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
							const telemetryData = { 
								userData: data,
								uaspec: uaspec,
								id: '',
								type: '',
								subtype: '',
								requestData : {
									deviceId: deviceId, 
									channelId: channelId, 
									appId: appId
								}
							}
							var response = '';
							console.log('responses', responses[0].quick_replies);
							if (responses && responses[0].text) {
								telemetryData.id = 'rasa';
								telemetryData.type = responses[0].intent;
								telemetryData.subtype = 'intent_detected';
								response = responses[0].text;
							}else {
								telemetryData.id = 'rasa';
								telemetryData.subtype = 'intent_not_detected';
								responseKey = getErrorMessageForInvalidInput(responses[0].intent);
								telemetryData.type = responseKey;	
								response = literals.message[responseKey];
							}
							telemetryHelper.logInteraction(telemetryData)
							sendResponse(sessionID, res, response)
						}
					})
				} else {
					var currentFlowStep = userData.currentFlowStep;
					var possibleFlow = currentFlowStep + '_' + body;
					var responseKey = ''
					const telemetryData = { 
						userData: data,
						uaspec: uaspec,
						id:'',
						type:'',
						subtype: '',
						requestData : {
							deviceId: deviceId, 
							channelId: channelId, 
							appId: appId
						}
					}
					if (chatflowConfig[possibleFlow]) {
						var respVarName = chatflowConfig[currentFlowStep].responseVariable;
						if (respVarName) {
							userData[respVarName] = body;
						}
						currentFlowStep = possibleFlow;
						responseKey = chatflowConfig[currentFlowStep].messageKey
						telemetryData.id = currentFlowStep;
						telemetryData.subtype= 'intent_detected';
						telemetryData.type = responseKey
					} else if (body === '0') {
						currentFlowStep = 'step1'
						responseKey = chatflowConfig[currentFlowStep].messageKey
						telemetryData.id = currentFlowStep;
						telemetryData.subtype = 'intent_detected';
						telemetryData.type = responseKey
					} else if (body === '99') {
						if (currentFlowStep.lastIndexOf("_") > 0) {
							currentFlowStep = currentFlowStep.substring (0, currentFlowStep.lastIndexOf("_"))
							responseKey = chatflowConfig[currentFlowStep].messageKey
							telemetryData.id = currentFlowStep;
							telemetryData.subtype = 'intent_detected';
							telemetryData.type = responseKey

						}
					} else {
						responseKey = getErrorMessageForInvalidInput(currentFlowStep)
						telemetryData.id = possibleFlow;
						telemetryData.subtype = 'intent_not_detected';
						telemetryData.type = responseKey
					}
					userData['currentFlowStep'] = currentFlowStep;
					setRedisKeyValue(sessionID, userData);
					telemetryHelper.logInteraction(telemetryData)
					sendChannelResponse(sessionID, res, responseKey, channel);
				}
			} else {
				// Implies new user. Adding data in redis for the key and also sending the WELCOME message
				userData = { sessionId: sessionID, currentFlowStep: 'step1' };
				setRedisKeyValue(sessionID, userData);
				const telemetryData = { 
					userData: data,
					userSpecData: uaspec,
					requestData : {
						deviceId: deviceId, 
						channelId: channelId, 
						appId: appId
					}
				}
				telemetryHelper.logSessionStart(telemetryData);
				const telemetryDataForInteraction = { 
					userData: data,
					uaspec: uaspec,
					id: 'step1',
					type: 'START',
					subtype: 'intent_detected',
					requestData : {
						deviceId: deviceId, 
						channelId: channelId, 
						appId: appId
					}
				}
				telemetryHelper.logInteraction(telemetryDataForInteraction)
				sendChannelResponse(sessionID, res, 'START', channel);
			}
		});
	}
}
function getErrorMessageForInvalidInput(currentFlowStep){
	if (chatflowConfig[currentFlowStep + '_error']) {
		return chatflowConfig[currentFlowStep + '_error'].messageKey;
	} else {
		return chatflowConfig['step1_wrong_input'].messageKey
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
	// telemetryHelper.initializeTelemetry()
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
