const request = require('request')
const jwt = require('jsonwebtoken')
const parser = require('ua-parser-js')
const _ = require('lodash')
const uuidv1 = require('uuid/v1')
const dateFormat = require('dateformat')
const envHelper = require('./environmentVariablesHelper.js')
const apiToken = envHelper.PORTAL_API_AUTH_TOKEN
const telemetryPacketSize = envHelper.PORTAL_TELEMETRY_PACKET_SIZE
const Telemetry = require('sb_telemetry_util')
const telemetry = new Telemetry()
const appId = envHelper.APPID
const fs = require('fs')
const path = require('path')
const contentURL = envHelper.CONTENT_URL
const telemtryEventConfig = JSON.parse(fs.readFileSync(path.join(__dirname, './telemetryEventConfig.json')))
const packageObj = JSON.parse(fs.readFileSync('package.json', 'utf8'));

telemtryEventConfig['pdata']['id'] = appId
telemtryEventConfig['pdata']['ver'] = packageObj.version
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
    //var channel = req.session.rootOrghashTagId || _.get(req, 'headers.X-Channel-Id')
	//console.log('Channel', channel);
	//var dims = _.clone(req.session.orgs || [])
    //dims = dims ? _.concat(dims, channel) : channel
    //const edata = telemetry.startEventData('session')
    //edata.uaspec = this.getUserSpec(req)
    //const context = telemetry.getContextData({ channel: channel, env: 'user' })
    //context.sid = req.sessionID
   // context.did = req.session.deviceId
    //context.rollup = telemetry.getRollUpData(dims)
    //const actor = telemetry.getActorData(req.session.userId, 'user')
   //console.log('logging session start event', context.did);
    /* telemetry.start({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channel)
    })
    callback(null, {did: context.did})*/
  },

  /**
   * this function helps to generate session end event
   */
  logSessionEnd: function (req) {
    const edata = telemetry.endEventData('session')
    const actor = telemetry.getActorData(req.session.userId, 'user')
    var dims = _.clone(req.session.orgs || [])
    var channel = req.session.rootOrghashTagId || _.get(req, 'headers.X-Channel-Id')
    const context = telemetry.getContextData({ channel: channel, env: 'user' })
    context.sid = req.sessionID
    context.did = req.session.deviceId
    console.log('logging session end event', context.did);
    context.rollup = telemetry.getRollUpData(dims)
    telemetry.end({
      edata: edata,
      context: context,
      actor: actor,
      tags: _.concat([], channel)
    })
  },

  logImpressionEvent: function (req, options) {
    const apiConfig = telemtryEventConfig.URL[req.uri] || {}
    let object = options.obj || {}
    const edata =  {
      type: options.edata.type,
      subtype: options.edata.subtype,
      pageid: options.edata.pageid,
      uri: options.edata.uri,
      visits: options.edata.visits
    }
    let channel = req.session.rootOrghashTagId || req.get('x-channel-id') || envHelper.defaultChannelId
    let dims = _.compact(_.concat(req.session.orgs, channel))
    const context = {
      channel: options.context.channel || channel,
      env: options.context.env || apiConfig.env,
      cdata: options.context.cdata,
      rollup: options.context.rollup || telemetry.getRollUpData(dims),
      did: options.context.did,
      sid: req.sessionID || uuidv1()
    }
    const actor = {
      id: req.userId ? req.userId.toString() : 'anonymous',
      type: 'user'
    }
    if(!channel){
      console.log('logAuditEvent failed due to no channel')
      return;
    }
    console.log(edata, context, object, actor);
    telemetry.impression({
      edata: _.pickBy(edata, value => !_.isEmpty(value)),
      context: _.pickBy(context, value => !_.isEmpty(value)),
      object: _.pickBy(object, value => !_.isEmpty(value)),
      actor: _.pickBy(actor, value => !_.isEmpty(value)),
      tags: _.concat([], dims)
    })
  },
  logSessionEvents: function (req, res) {
    if (req.body && req.body.event) {
      req.session['sessionEvents'] = req.session['sessionEvents'] || []
      req.session['sessionEvents'].push(JSON.parse(req.body.event))
      if (req.session['sessionEvents'].length >= parseInt(telemetryPacketSize, 10)) {
        /* istanbul ignore next  */
        module.exports.sendTelemetry(req, req.session['sessionEvents'], function (err, status) {
          if (err) {
            console.log('telemetry sync error from  portal', err)
          }
          req.session['sessionEvents'] = []
          req.session.save()
        })
      }
    }
    res.end()
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
      url: envHelper.TELEMETRY_SERVICE_LOCAL_URL + 'v1/telemetry',
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
    var actor = {}
    if (req.session && req.session.userId) {
      actor.id = req.session && req.session.userId
      actor.type = 'user'
    } else {
      actor.id = req.headers['x-consumer-id'] || telemtryEventConfig.default_userid
      actor.type = req.headers['x-consumer-username'] || telemtryEventConfig.default_username
    }
    return actor
  },

  generateTelemetryForProxy: function (req, res, next) {
    let params = [
      { 'url': req.originalUrl },
      { 'protocol': 'https' },
      { 'method': req.method },
      { 'req': req.body }
    ]
    const edata = telemetry.logEventData('api_access', 'INFO', '', params)
    var channel = (req.session && req.session.rootOrghashTagId) || req.get('x-channel-id')
    if (channel) {
      var dims = req.session['rootOrgId'] || []
      dims = req.session.orgs ? _.concat(dims, req.session.orgs) : dims
      dims = _.concat(dims, channel)
      const context = telemetry.getContextData({ channel: channel, env: req.telemetryEnv })
      if (req.sessionID) {
        context.sid = req.sessionID
      }
      if (req.get('x-device-id')) {
        context.did = req.get('x-device-id')
      }
      context.rollup = telemetry.getRollUpData(dims)
      telemetry.log({
        edata: edata,
        context: context,
        actor: module.exports.getTelemetryActorData(req),
        tags: _.concat([], channel)
      })
    }

    next()
  },
  initializeTelemetry: function() {
	telemetry.init({
		pdata: { id: envHelper.APPID, ver: '1.0.0' },
		method: 'POST',
		batchsize: process.env.sunbird_telemetry_sync_batch_size || 200,
		endpoint: telemtryEventConfig.endpoint,
		host: envHelper.TELEMETRY_SERVICE_LOCAL_URL,
		authtoken: 'Bearer ' + envHelper.PORTAL_API_AUTH_TOKEN
	})
  }
}