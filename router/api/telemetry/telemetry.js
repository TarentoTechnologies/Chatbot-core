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
  logSessionStart: function (sessionData) {
    console.log(sessionData);
    const uaspec = sessionData.userSpecData   
    var channel = 'dikshavani'  // req.session.rootOrghashTagId || _.get(req, 'headers.X-Channel-Id')
    var dims = []// _.clone(req.session.orgs || [])
    //dims = dims ? _.concat(dims, channel) : channel
    const edata = telemetry.startEventData('session')
    edata.uaspec = uaspec
    const context = telemetry.getContextData({ channel: channel, env: 'dikshavani_bot' })
    context.sid = sessionData.userData.customData.userId
    context.did = '6b17499998d0284e57d91ac20ebd82e3'
    context.rollup = {} // telemetry.getRollUpData(dims)
    const actor = telemetry.getActorData(sessionData.userData.customData.userId, 'user')
    console.log('logging session start event', context.did);
    telemetry.start({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channel)
    })
  },

  /**
   * this function helps to generate session start event
   */
  logInteraction: function (data) {
    try {
      const userData = data.userData
      const userId = userData.customData.userId
      const value =  [];
      value.push(data.stepResponse);
      const interactionData = { 
        type: 'SPEAK',
        id: 'diksha-bot',
        extra: {
          pos: "",
          values: [],
        }
      };
      interactionData.extra = { pos: [{ step: data.step, userInput: data.userData.message }], values: value}
      var channel = 'dikshavani'  // req.session.rootOrghashTagId || _.get(req, 'headers.X-Channel-Id')
      var dims = []// _.clone(req.session.orgs || [])
      //dims = dims ? _.concat(dims, channel) : channel
      const context = telemetry.getContextData({ channel: channel, env: 'dikshavani_bot' })
      context.sid = userId
      context.did = '6b17499998d0284e57d91ac20ebd82e3'
      context.rollup = {} // telemetry.getRollUpData(dims)
      const actor = telemetry.getActorData(userId, 'user')
      var options = { 
        context: context, // To override the existing context
        object: {}, // To override the existing object
        actor: actor, // To override the existing actor
        tags: _.concat([], channel), // To override the existing tags
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