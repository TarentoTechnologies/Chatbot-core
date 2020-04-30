const _ = require('lodash')
var config = require('../../config/config')
var LOG = require('../../log/logger')
const Telemetry = require('sb_telemetry_util')
const telemetry = new Telemetry()
module.exports = {


  /**
   * this function helps to generate session start event
   */
  logSessionStart: function (sessionData) {
    const uaspec = sessionData.userSpecData 
    var dims = []
    var channelId = sessionData.requestData.channelId
    var splitedChannelId = channelId.split('.');
    const edata = telemetry.startEventData('botsession')
    edata.uaspec = uaspec
    const context = telemetry.getContextData({ channel: channelId, env: splitedChannelId[1] + '.' + splitedChannelId[2]})
    context.sid = sessionData.sid
    context.did = sessionData.requestData.deviceId
    context.rollup = telemetry.getRollUpData(dims)
    const actor = telemetry.getActorData(sessionData.userData.customData.userId, 'user')
    telemetry.start({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channelId)
    })
  },

  /**
   * this function helps to generate session start event
   */
  logInteraction: function (data) {
    try {
      const userData = data.userData
      const userId = userData.customData.userId
      const interactionData = { 
        type: data.type,
        subtype: data.subtype,
        id: data.id
      };
      var channelId = data.requestData.channelId
      var splitedChannelId = channelId.split('.');
      var dims = []
      const context = telemetry.getContextData({ channel: channelId, env: splitedChannelId[1] + '.' + splitedChannelId[2]})
      context.sid = data.sid
      context.did = data.requestData.deviceId
      context.rollup = telemetry.getRollUpData(dims)
      const actor = telemetry.getActorData(userId, 'user')
      var options = { 
        context: context, // To override the existing context
        object: {}, // To override the existing object
        actor: actor, // To override the existing actor
        tags: _.concat([], channelId), // To override the existing tags
        runningEnv: "server" // It can be either client or server
      }

      telemetry.interact({
        data: interactionData,
        options: options
      });
    } catch(e) {
      LOG.error('Error while interaction event',e)
    }
  },

  initializeTelemetry: function(data) {
    try {
      telemetry.init({
        pdata: { id: data.appId, ver: '1.0', pid: 'dikshavani.' + data.pid },
        method: 'POST',
        version: '1.0',
        batchsize: config.TELEMETRY_SYNC_BATCH_SIZE,
        endpoint: config.TELEMETRY_ENDPOINT,
        host: config.TELEMETRY_SERVICE_LOCAL_URL,
        headers: {
          'x-app-id': data.appId, 
          'Authorization':'Bearer ' + data.apiToken,
          'x-channel-id': data.channelId,
          'x-device-id' : data.deviceId
        }
      })
    } catch(e) {
      LOG.error('Error while initilising telemetry', e)
    }
  }
} 