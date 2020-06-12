// exit codes
const SUCCESS = 0;
const INVALID_ARGUMENT = 1;
const MISSING_ARGUMENT = 2;

// default values
const DEFAULT_WIND_REPO = "github.com/Michi03/smart-energy-wind-test";
const DEFAULT_SUN_REPO = "github.com/Michi03/smart-energy-wind-test";
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 2201;
const IGNORE = [/.git/, /.gitignore/, /node_modules/];

function parseArgs (args) {
    let res = {port: DEFAULT_PORT, host: DEFAULT_HOST, windRepo: DEFAULT_WIND_REPO, sunRepo: DEFAULT_SUN_REPO};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
        case '--port':
            if (typeof args[i+1] === 'undefined') {
                error('--port requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.port = parseInt(args[i+1]);
            break;
        case '--host':
            if (typeof args[i+1] === 'undefined') {
                error('--host requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.host = args[i+1];
            break;
        case '--token':
            if (typeof args[i+1] === 'undefined') {
                error('--token requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.gitToken = args[i+1];
            break;
        case '--wind-repo':
            if (typeof args[i+1] === 'undefined') {
                error('--wind-repo requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.windRepo = args[i+1];
            break;
        case '--sun-repo':
            if (typeof args[i+1] === 'undefined') {
                error('--sun-repo requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.sunRepo = args[i+1];
            break;
        case '--help':
            console.log("Public Data Synchronization\n\
              --help   print this message\n\
              --host   set the host address of the server (default 0.0.0.0)\n\
              --port   set the port of the server (default 2201)\n\
              --repo   url of the repository that holds the data (default github.com/Michi03/public-data-project)\n\
              --token  git access token used to update data repository\n")
            process.exit(SUCCESS);
            break;
        }
    }

    if (!res.gitToken) {
        error("Missing argument: --token");
        process.exit(MISSING_ARGUMENT);
    }
    return res;
}

function validateReq(req) {
    let contentTypes = [];
    let requiredFields = [];
    let requiredParams = [];
    switch (req.method) {
        case 'DELETE':
            requiredParams.push('id');
            break;
        case 'PATCH':
            contentTypes.push('application/json');
            break;
        case 'POST':
            contentTypes.push('application/json');
            requiredFields.push('id');
            requiredFields.push('type');
            requiredFields.push('name');
            break;
    }
    if (contentTypes.length > 1 && (typeof req.header('Content-Type') !== 'string' || !contentTypes.includes(req.header('Content-Type').toLowerCase()))) {
      return {'status': 400, 'msg': `content-type ${req.header('Content-Type')} not supported, supported types are [${contentTypes}]`};
    }
    if (typeof req.body !== "object" || req.body === null) {
      return {'status': 400, 'msg': 'could not read body'};
    }
    for (let i = 0; i < requiredFields.length; i++) {
        if (typeof req.body[requiredFields[i]] !== "string" || req.body[requiredFields[i]].length < 1)
            return {'status': 400, 'msg': 'missing field: ' + requiredFields[i]};
    }
    for (let i = 0; i < requiredParams.length; i++) {
        if (typeof req.query[requiredParams[i]] !== "string" || req.query[requiredParams[i]].length < 1)
            return {'status': 400, 'msg': 'missing parameter: ' + requiredParams[i]};
    }
    return {'status': 200, 'msg': 'okay'};
}

function log(req) {
    const time = new Date();
    console.log(`[${time}] -- ${req.method} ${req.path} {${JSON.stringify(req.query)}} (${req.ip}) ${JSON.stringify(req.headers)}`);
}

function ignore(file) {
    for (let i = 0; i < IGNORE.length; i++) {
        if (IGNORE[i].exec(file))
            return true;
    }
    return false;
}

function error(msg) {
    console.log('ERROR: ' + msg);
}

module.exports = {parseArgs, validateReq, log, ignore, error};
