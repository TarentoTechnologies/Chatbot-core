const env = process.env

var config = {};
config.RASA_API_TIMEOUT              = 200000
config.RASA_CORE_ENDPOINT            = env.RASA_CORE_ENDPOINT || 'http://localhost:5005/webhooks/rest/webhook'
config.SOCKET_HTTP_PORT              = 4005
config.REST_HTTP_PORT                = env.HTTP_PORT || 8000
config.SOCKET_HTTPS_PORT             = 4001
config.REST_HTTPS_PORT               = 8443
config.TELEGRAM_HTTPS_PORT           = 4009

config.HTTPS_PATH_KEY                = env.HTTPS_PATH_KEY || ''
config.HTTPS_PATH_CERT               = env.HTTPS_PATH_CERT || ''
config.HTTPS_PATH_CA                 = env.HTTPS_PATH_CA || ''

config.REDIS_PORT					 = 6379
config.REDIS_HOST					 = env.REDIS_HOST || 'localhost'

config.SUNBIRD_ENVIRONMENT			       = env.sunbird_environment || 'sunbird.env'
config.SUNBIRD_INSTANCE 			       = env.sunbird_instance || 'sunbird.ins'
config.SUNBIRD_TELEMETRY_SYNC_BATCH_SIZE   = env.sunbird_telemetry_sync_batch_size || 20
config.SUNBIRD_CONTENT_REPO_API_KEY        = env.sunbird_content_repo_api_key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIyZThlNmU5MjA4YjI0MjJmOWFlM2EzNjdiODVmNWQzNiJ9.gvpNN7zEl28ZVaxXWgFmCL6n65UJfXZikUWOKSE8vJ8' // API key for the content provider URL
config.SUNBIRD_TELEMETRY_SERVICE_LOCAL_URL = env.sunbird_telemetry_service_local_url || 'http://telemetry-service:9001/'

config.ELASTIC_HOST                  = 'http://<user>:<password><IP>:<Port>'
config.ELASTIC_INDEX_NAME            = 'indx_name'
config.ELASTIC_INDEX_TYPE            = 'indx_type'

config.TELEGRAM_BOT_ENDPOINT         = 'https://api.telegram.org/bot<bot_secret_key>/sendMessage'

module.exports = config;
