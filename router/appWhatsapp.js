const express          = require('express');
const bodyParser       = require('body-parser');
const cors             = require('cors');
const axios            = require('axios');
var https              = require('https');
var http               = require('http');
var fs                 = require('fs');
var origins            = require('./config/corsList');
var LOG                = require('./log/logger');
var literals           = require('./config/literals');
var config             = require('./config/config');
var RasaCoreController = require('./controllers/rasaCoreController');
var EDB                = require('./api/elastic/connection');
const appBot           = express();

// IVR is best done outside the bot...as no NLU interpretation is required

// Cors handling
appBot.use(cors());

// Body parsers for requests
appBot.use(bodyParser.json());
appBot.use(bodyParser.urlencoded({ extended: false }));

// This object tracks session. It needs to be moved to Redis
var memory = {};

// Route that receives a POST request to /bot
appBot.post('/whatsapp', function (req, res) {
	LOG.info('req.body:')
	LOG.info(req.body);

	// Payload set when setting up webhook URL in gupshup: i.e: Enter your Callback URL
	/*{"app": "DemoAppName", "timestamp": 1585903899563, "version": 2, "type": "user-event",
    "payload": {"phone": "callbackSetPhone", "type": "sandbox-start"}}*/

	// Regular payload
	/*{{"app": "DemoApp", "timestamp": 1580227766370, "version": 2, "type": "message",
		"payload": { "id": "ABEGkYaYVSEEAhAL3SLAWwHKeKrt6s3FKB0c", "source": "9876543210", "type": "text",
					"payload": {"text": "1"},
		"sender": {"phone": "9876543210","name": "Manoj"}}}*/

	const payloadType = req.body.type;//:

	LOG.info("req.body.type:");
	LOG.info(payloadType);

	// If payload type is user-event, just send 1 as response, this is mostly setup webhook call
	if (payloadType === "user-event") {
		res.send('1');

		return;
	}

	const body          = req.body.payload.payload.text; // 'I am CBSE student from Maharashtra';
	const payloadNumber = req.body.payload.sender.phone; // 9876543210

	LOG.info("req.body.payload.payload.text:");
	LOG.info(body);
	LOG.info("req.body.payload.sender.phone:");
	LOG.info(payloadNumber);

	data = { message: body, customData: { userId: md5(payloadNumber) } };
	sessionID = md5(payloadNumber);

	LOG.info('context for: ' + sessionID);
	LOG.info(memory[sessionID]);

	getResponseFromRasa(sessionID, res, body);
});

// Calls Rasa, and sends resposne to user
function getResponseFromRasa(sessionID, res, body) {
	res.set("Content-Type", "text/plain");

	// Persisting incoming data to EDB
	dataPersist = { 'message': body, 'channel': 'whatsapp' };
	// EDB.saveToEDB(dataPersist, 'user', sessionID,(err,response)=>{})

	if (body == '0') {
		memory = {}
	}
	// all non numeric user messages go to bot
	if (isNaN(body)) {
		///Bot interaction flow
		RasaCoreController.processUserData(data, sessionID, (err, resp) => {
			if (err) {
				emitToUser(sessionID, res, literals.message.SORRY)
			} else {
				let responses = resp.res;
				for (var i = 0; i < responses.length; i++) {
					emitToUser(sessionID, res, responses[i].text)
				}
			}
		})
	}
	// this section with numeric input does not require NLU interpretation so it will not go to Bot
	else if (memory[sessionID]) {
		////this if-else cascade is difficult to maintain, so working on a json config to drive this decision tree
		if (memory[sessionID]['role']) {
			if (memory[sessionID]['educationLvl']) {
				if (memory[sessionID]['board']) {
					if (memory[sessionID]['board'] == '1') {
						emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
						delete memory[sessionID]
					} else if (memory[sessionID]['board'] == '2') {
						if (memory[sessionID]['boardType']) {
							if (memory[sessionID]['boardType'] == '1') {
								emitToUser(sessionID, res, literals.message.LINK + 'AP')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '2') {
								emitToUser(sessionID, res, literals.message.LINK + 'KA')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '3') {
								emitToUser(sessionID, res, literals.message.LINK + 'TN')
								delete memory[sessionID]
							}
						}
						else {
							LOG.info('setting up boardType:' + body)
							memory[sessionID]['boardType'] = body
							if (memory[sessionID]['boardType'] == '1') {
								emitToUser(sessionID, res, literals.message.LINK + 'AP')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '2') {
								emitToUser(sessionID, res, literals.message.LINK + 'KA')
								delete memory[sessionID]
							}
							if (memory[sessionID]['boardType'] == '3') {
								emitToUser(sessionID, res, literals.message.LINK + 'TN')
								delete memory[sessionID]
							}
						}
					} else {
						emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)
					}
				}
				else {
					if (body == '1') {
						LOG.info('setting up board:' + body)
						memory[sessionID]['board'] = body
						emitToUser(sessionID, res, literals.message.LINK + 'CBSE')
						delete memory[sessionID]
					} else if (body == '2') {
						LOG.info('setting up board:' + body)
						memory[sessionID]['board'] = body
						emitToUser(sessionID, res, literals.message.CHOOSE_STATE)
					} else {
						emitToUser(sessionID, res, literals.message.BOARD_NOT_HANDLED)

					}
				}
			}
			else {
				LOG.info('setting up educationLvl:' + body)
				memory[sessionID]['educationLvl'] = body
				if (body == '2') {
					emitToUser(sessionID, res, literals.message.LINK)
					delete memory[sessionID]
				} else {
					emitToUser(sessionID, res, literals.message.CHOOSE_BOARD)
				}
			}
		}
		else {
			LOG.info('setting up role:' + body)
			memory[sessionID]['role'] = body
			emitToUser(sessionID, res, literals.message.EDUCATION_LEVEL)
		}
	} else {
		memory[sessionID] = {}
		emitToUser(sessionID, res, literals.message.MENU)
	}
}

// Send data to user (gupshup in this case)
function emitToUser(sessionID, client, text) {
	// Persisting outgoing data to EDB
	dataPersist = { message: text, channel: "rest" };
	// EDB.saveToEDB(dataPersist, 'bot', sessionID,(err,response)=>{})

	// Emit to client
	client.send(text);
}

// Md5
function md5(d){return rstr2hex(binl2rstr(binl_md5(rstr2binl(d),8*d.length)))}function rstr2hex(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function rstr2binl(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function binl2rstr(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function binl_md5(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}

// Http endpoint
http.createServer(appBot).listen(config.REST_HTTP_PORT, function (err) {
	if (err) {
		throw err;
	}

	LOG.info('Server started on port ' + config.REST_HTTP_PORT);
});

// Https endpoint only started if you have updated the config with key/crt files
if (config.HTTPS_PATH_KEY) {
	//https certificate setup
	var options = {
		key: fs.readFileSync(config.HTTPS_PATH_KEY),
		cert: fs.readFileSync(config.HTTPS_PATH_CERT),
		ca: fs.readFileSync(config.HTTPS_PATH_CA)
	};

	https.createServer(options, appBot).listen(config.REST_HTTPS_PORT, function (err) {
		if (err) {
			throw err;
		}

		LOG.info('Server started on port ' + config.REST_HTTPS_PORT);
	});
}
