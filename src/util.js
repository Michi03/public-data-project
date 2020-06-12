// exit codes
const SUCCESS = 0;
const INVALID_ARGUMENT = 1;
const MISSING_ARGUMENT = 2;

// default values
const DEFAULT_REPO = "github.com/Michi03/public-data-project";
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 2201;
const IGNORE = [/.git/, /.gitignore/, /node_modules/];

function parseArgs (args) {
    let res = {port: DEFAULT_PORT, host: DEFAULT_HOST, repoUrl: DEFAULT_REPO};
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
        case '--repo':
            if (typeof args[i+1] === 'undefined') {
                error('--repo requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.repoUrl = args[i+1];
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
    switch (req.method) {
        case 'DELETE':
            contentTypes = ['application/json'];
            requiredFields = ['id'];
            break;
        case 'PATCH':
            contentTypes = ['application/json'];
            requiredFields = ['id'];
            break;
        case 'POST':
            contentTypes = ['application/json', 'application/zip'];
            requiredFields = ['id'];
            break;
    }
    if (typeof req.header('Content-Type') !== 'string' || !contentTypes.includes(req.header('Content-Type').toLowerCase())) {
      return {'status': 400, 'msg': `content-type ${req.header('Content-Type')} not supported, supported types are [${contentTypes}]`};
    }
    if (typeof req.body !== "object" || req.body === null) {
      return {'status': 400, 'msg': 'could not read body'};
    }
    for (let i = 0; i < requiredFields.length; i++) {
        if (typeof req.body[requiredFields[i]] !== "string" || req.body[requiredFields[i]].length < 1)
            return {'status': 400, 'msg': 'missing ' + requiredFields[i]};
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
