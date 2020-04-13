const request = require('request')
const jwt = require('jsonwebtoken')
const parser = require('ua-parser-js')
const _ = require('lodash')
const uuidv1 = require('uuid/v1')
const dateFormat = require('dateformat')
var config = require('../../config/config')
const apiToken = config.PORTAL_API_AUTH_TOKEN
const Telemetry = require('sb_telemetry_util')
const telemetry = new Telemetry()
const appId = config.APPID
const fs = require('fs')
const path = require('path')
const contentURL = config.CONTENT_URL
const telemtryEventConfig = JSON.parse(fs.readFileSync(path.join(__dirname, './telemetryEventConfig.json')))
//const packageObj = JSON.parse(fs.readFileSync('package.json', 'utf8'));

telemtryEventConfig['pdata']['id'] = appId
telemtryEventConfig['pdata']['ver'] = 1.0
telemtryEventConfig['pdata']['pid'] = appId

module.exports = {
  /**
   * This function helps to get user spec
   */
  getUserSpec: function (req) {
    var ua = parser(req.headers['user-agent'])
    return {
      'agent': ua['browser']['name'],
      'ver': ua['browser']['version'],
      'system': ua['os']['name'],
      'platform': ua['engine']['name'],
      'raw': ua['ua']
    }
  },

  /**
   * this function helps to generate session start event
   */
  logSessionStart: function (req, callback) {
	console.log('Body', req.body);
    var channel = 'dikshavani' //req.session.rootOrghashTagId || _.get(req, 'headers.X-Channel-Id')
	//console.log('Channel', channel);
	var dims = [] // _.clone(req.session.orgs || [])
    // dims = dims ? _.concat(dims, channel) : channel
    const edata = telemetry.startEventData('session')
    edata.uaspec = this.getUserSpec(req)
	const context = telemetry.getContextData({ channel: channel, env: 'user' })
	console.log('Contextt ', context);
    context.sid = req.body.From
    context.did = 'bot-client' // req.session.deviceId
    context.rollup = telemetry.getRollUpData(dims)
    const actor = telemetry.getActorData(req.body.From, 'user')
    console.log('logging session start event', actor);
     console.log('I am starting', telemetry.start({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channel)
    }));
    // callback(null, {did: context.did})
  },

  /**
   * this function helps to generate session end event
   */
  logSessionEnd: function (req) {
  },

  logImpressionEvent: function (req, options) {

  },
  logSessionEvents: function (req, res) {
  },
  prepareTelemetryRequestBody: function (req, eventsData) {
    var data = {
      'id': 'ekstep.telemetry',
      'ver': '3.0',
      'ts': dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss:lo'),
      'params': {
        'requesterId': req.session.userId,
        'did': telemtryEventConfig.default_did,
        'msgid': uuidv1()
      },
      'events': eventsData
    }
    return data
  },
  sendTelemetry: function (req, eventsData, callback) {
    /* istanbul ignore if  */
    if (!eventsData || eventsData.length === 0) {
      if (_.isFunction(callback)) {
        callback(null, true)
      }
    }
    var data = this.prepareTelemetryRequestBody(req, eventsData)
    var options = {
      method: 'POST',
      url: config.TELEMETRY_SERVICE_LOCAL_URL + 'v1/telemetry',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiToken
      },
      body: data,
      json: true
    }
    /* istanbul ignore next  */
    request(options, function (error, response, body) {
      if (_.isFunction(callback)) {
        /* istanbul ignore if  */
        if (error) {
          console.log('telemetry sync error while syncing  portal', error)
          callback(error, false)
        } else if (body && body.params && body.params.err) {
          /* istanbul ignore next  */
          console.log('telemetry sync error while syncing  portal', body.params.err)
          /* istanbul ignore next  */
          callback(body, false)
        } else {
          callback(null, true)
        }
      }
    })
  },

  /**
   * This function helps to get actor data for telemetry
   */
  getTelemetryActorData: function (req) {
  },

  initializeTelemetry: function() {
	telemetry.init({
		pdata: { id: appId, ver: '1.0.0' },
		method: 'POST',
		batchsize: 200,
		endpoint: telemtryEventConfig.endpoint,
		host: config.TELEMETRY_SERVICE_LOCAL_URL,
		authtoken: 'Bearer ' + apiToken
	})
  }
}