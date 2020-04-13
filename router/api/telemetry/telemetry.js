const parser = require('ua-parser-js')
const _ = require('lodash')
var config = require('../../config/config')
const apiToken = config.PORTAL_API_AUTH_TOKEN
const Telemetry = require('sb_telemetry_util')
const telemetry = new Telemetry()
const appId = config.APPID
const fs = require('fs')
const path = require('path')
const telemtryEventConfig = JSON.parse(fs.readFileSync(path.join(__dirname, './telemetryEventConfig.json')))

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
	// console.log('Body', req.body);
    var channel = 'dikshavani' //req.session.rootOrghashTagId || _.get(req, 'headers.X-Channel-Id')
	//console.log('Channel', channel);
	var dims = [] // _.clone(req.session.orgs || [])
  // dims = dims ? _.concat(dims, channel) : channel
    const edata = telemetry.startEventData('session')
    edata.uaspec = this.getUserSpec(req)
	const context = telemetry.getContextData({ channel: channel, env: 'user' })
    context.sid = req.body.From
    context.did = 'bot-client' // req.session.deviceId
    context.rollup = telemetry.getRollUpData(dims)
    const actor = telemetry.getActorData(req.body.From, 'user')
    telemetry.log({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channel)
    });
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

  /**
   * This function helps to get actor data for telemetry
   */
  getTelemetryActorData: function (req) {
  },

  initializeTelemetry: function() {
    telemetry.init({
      pdata: { id: appId, ver: '1.0' },
      method: 'POST',
      batchsize: 1,
      endpoint: 'v1/telemetry',
      host: 'https://staging.ntp.net.in/content/data/',
      authtoken: 'Bearer ' + apiToken
    })
  }
} 