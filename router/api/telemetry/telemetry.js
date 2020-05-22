const _ = require('lodash')
var config = require('../../config/config')
const apiToken = config.PORTAL_API_AUTH_TOKEN
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
    var appId = sessionData.requestData.appId
    const edata = telemetry.startEventData('botsession')
    edata.uaspec = uaspec
    var pdata = { id: appId, ver: config.TELEMETRY_DATA_VERSION, pid: 'dikshavani.botclient' };
    const context = telemetry.getContextData({ channel: channelId, env: appId, pdata: pdata})
    context.sid = sessionData.sid
    context.did = sessionData.requestData.deviceId
    context.rollup = telemetry.getRollUpData(dims)
    const actor = telemetry.getActorData(sessionData.userData.customData.userId, 'user')
    var headers = [];
    var channelIdHeader = { key: 'x-channel-id', value : channelId };
    headers.push(channelIdHeader);
    telemetry.start({
      edata: edata,
      headers: headers,
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
      var appId = data.requestData.appId
      var dims = []
      var pdata = { id: appId, ver: config.TELEMETRY_DATA_VERSION, pid: 'dikshavani.botclient' };
      const context = telemetry.getContextData({ channel: channelId, env: appId, pdata: pdata})
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
      var headers = [];
      var channelIdHeader = { key: 'x-channel-id', value : channelId };
      headers.push(channelIdHeader);
      telemetry.interact({
        data: interactionData,
        options: options,
        headers: headers
      });
    } catch(e) {
      LOG.error('Error while interaction event')
    }
  },

  initializeTelemetry: function() {
    
    try {
      telemetry.init({
        method: 'POST',
        version: '1.0',
        batchsize: config.TELEMETRY_SYNC_BATCH_SIZE,
        endpoint: config.TELEMETRY_ENDPOINT,
        host: config.TELEMETRY_SERVICE_LOCAL_URL,
        headers: {
          'x-app-id': 'dikshavani.botclient', 
          'Authorization':'Bearer ' + apiToken,
          'x-device-id' : ''
        }
      })
    } catch(e) {
      LOG.error('Error while initilising telemetry')
    }
  }
} 