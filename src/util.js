// exit codes
const SUCCESS = 0;
const INVALID_ARGUMENT = 1;
const MISSING_ARGUMENT = 2;

// default values
const DEFAULT_REPO = "github.com/Michi03/public-data-project";
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 2201;

var projects = {};

function parseArgs (args) {
    let res = {port: DEFAULT_PORT, host: DEFAULT_HOST, repoUrl: DEFAULT_REPO};
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
        case '--port':
            if (typeof args[i+1] === 'undefined') {
                console.log('--port requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.port = parseInt(args[i+1]);
            break;
        case '--host':
            if (typeof args[i+1] === 'undefined') {
                console.log('--host requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.host = args[i+1];
            break;
        case '--token':
            if (typeof args[i+1] === 'undefined') {
                console.log('--token requires an argument');
                process.exit(INVALID_ARGUMENT);
            }
            else
                res.gitToken = args[i+1];
            break;
        case '--repo':
            if (typeof args[i+1] === 'undefined') {
                console.log('--repo requires an argument');
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
        console.log("Missing argument: --token");
        process.exit(MISSING_ARGUMENT);
    }
    return res;
}

function validateReq(req) {
    let contentTypes = [];
    switch (req.method) {
        case 'DELETE':
            contentTypes = ['application/json'];
            if (typeof req.body['id'] !== "string" || req.body['id'].length < 1) {
              return {'status': 400, 'msg': 'missing id'};
            }
            if (typeof projects[req.body['id']] === 'undefined') {
                return {'status': 404, 'msg': "Project does not exist"};
            }
            break;
        case 'PATCH':
            contentTypes = ['application/json'];
            if (typeof req.body['id'] !== "string" || req.body['id'].length < 1) {
              return {'status': 400, 'msg': 'missing id'};
            }
            if (typeof projects[req.body['id']] === 'undefined') {
                return {'status': 404, 'msg': "Project does not exist"};
            }
            break;
        case 'POST':
            contentTypes = ['application/json', 'application/zip'];
            if (typeof req.body['id'] !== "string" || req.body['id'].length < 1) {
              return {'status': 400, 'msg': 'missing id'};
            }
            if (typeof projects[req.body['id']] !== 'undefined') {
                return {'status': 400, 'msg': "Project already exists"};
            }
            break;
    }
    if (typeof req.header('Content-Type') !== 'string' || !contentTypes.includes(req.header('Content-Type').toLowerCase())) {
      return {'status': 400, 'msg': `content-type ${req.header('Content-Type')} not supported, supported types are [${contentTypes}]`};
    }
    if (typeof req.body !== "object" || req.body === null) {
      return {'status': 400, 'msg': 'could not read body'};
    }
    return {'status': 200, 'msg': 'okay'};
}

function log(req) {
    const time = new Date();
    console.log(`[${time}] -- ${req.method} ${req.path} (${req.ip}) ${JSON.stringify(req.headers)}`);
}

module.exports = {parseArgs, validateReq, log};
