var winston = require('winston');

var logger = winston.createLogger({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    // Commenting the below line as we will not need errors/info logging into file , We are already loggin errors/info in console.
    // new winston.transports.File({ filename: __dirname + '/debug.log', json: false })
  ],
  exceptionHandlers: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/exceptions.log', json: false })
  ],
  exitOnError: false
});

module.exports = logger;
