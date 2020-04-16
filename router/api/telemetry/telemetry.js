const _ = require('lodash')
var config = require('../../config/config')
var LOG = require('../../log/logger')
const apiToken = config.PORTAL_API_AUTH_TOKEN
const Telemetry = require('sb_telemetry_util')
const telemetry = new Telemetry()
const appId = config.APPID

module.exports = {

  /**
   * this function helps to generate session start event
   */
  logInteraction: function (data) {
    try {
      const userData = data.userData
      const userId = userData.customData.userId
      var channel = 'dikshavani'
      var dims = [] // _.clone(req.session.orgs || [])
      // dims = dims ? _.concat(dims, channel) : channel
      const edata = telemetry.startEventData('session')
      edata.uaspec = data.uaspec
      const value =  [];
      value.push(data.stepResponse);
      edata.extra = { pos: [{ "step": data.step }], values: value}
      const context = telemetry.getContextData({ channel: channel, env: 'user' })
      context.sid = userId
      context.did = 'bot-client' // req.session.deviceId
      context.rollup = telemetry.getRollUpData(dims)
      const actor = telemetry.getActorData(userId, 'user')
      
      telemetry.interact({
        edata: edata,
        context: context,
        actor: actor,
        tags: _.concat([], channel)
      });
    } catch(e) {
      LOG.error('Error while interacting event',e)
    }
  },

  initializeTelemetry: function() {
    try {
      telemetry.init({
        pdata: { id: appId, ver: '1.0' },
        method: 'POST',
        batchsize: config.TELEMETRY_SYNC_BATCH_SIZE,
        endpoint: config.TELEMETRY_ENDPOINT,
        host: config.TELEMETRY_SERVICE_LOCAL_URL,
        authtoken: 'Bearer ' + apiToken
      })
    } catch(e) {
      LOG.error('Error while initilising telemetry', e)
    }
  }
} 