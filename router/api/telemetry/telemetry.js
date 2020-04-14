const parser = require('ua-parser-js')
const _ = require('lodash')
var config = require('../../config/config')
const apiToken = config.PORTAL_API_AUTH_TOKEN
const Telemetry = require('sb_telemetry_util')
const telemetry = new Telemetry()
const appId = config.APPID

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

  logSessionStart: function (data) {
    console.log('New User', data);
    telemetryHelper.log
  },

  /**
   * this function helps to generate session start event
   */
  logInteraction: function (data) {
    const req = data.requestObj
    var channel = 'dikshavani'
    var dims = [] // _.clone(req.session.orgs || [])
    // dims = dims ? _.concat(dims, channel) : channel
    const edata = telemetry.startEventData('session')
    edata.uaspec = this.getUserSpec(req)
    const value =  [];
    value.push(data.stepResponse);
    edata.extra = { pos: [{ "step": data.step }], values: value}
    const context = telemetry.getContextData({ channel: channel, env: 'user' })
    context.sid = req.body.From
    context.did = 'bot-client' // req.session.deviceId
    context.rollup = telemetry.getRollUpData(dims)
    const actor = telemetry.getActorData(req.body.From, 'user')
    telemetry.interact({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channel)
    });
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
      batchsize: config.TELEMETRY_SYNC_BATCH_SIZE,
      endpoint: config.TELEMETRY_ENDPOINT,
      host: config.TELEMETRY_SERVICE_LOCAL_URL,
      authtoken: 'Bearer ' + apiToken
    })
  }
} 