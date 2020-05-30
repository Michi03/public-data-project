// includes
const app = require('express')();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const {spawn} = require("child_process");
app.use(bodyParser.json({limit:'100mb'}));

// exit codes
const SUCCESS = 0;
const INVALID_ARGUMENT = 1;
const MISSING_ARGUMENT = 2;

// config values
var port = 2201;
var host = "0.0.0.0";
var gitToken;

const args = process.argv.slice(2);

// parse command line arguments
for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
    case '--port':
        if (typeof args[i+1] === 'undefined') {
            console.log('--port requires an argument');
            process.exit(INVALID_ARGUMENT);
        }
        else
            port = parseInt(args[i+1]);
        break;
    case '--host':
        if (typeof args[i+1] === 'undefined') {
            console.log('--host requires an argument');
            process.exit(INVALID_ARGUMENT);
        }
        else
            host = args[i+1];
        break;
    case '--token':
        if (typeof args[i+1] === 'undefined') {
            console.log('--token requires an argument');
            process.exit(INVALID_ARGUMENT);
        }
        else
            gitToken = args[i+1];
        break;
    case '--help':
        console.log("Public Data Synchronization\n\
          --token  git access token used to update data repository (required)\n\
          --help   print this message\n\
          --host   set the host address of the server (default 0.0.0.0)\n\
          --port   set the port of the server (default 2201)\n")
        process.exit(SUCCESS);
        break;
    }
}

if (!gitToken) {
    console.log("Missing argument: --token");
    process.exit(MISSING_ARGUMENT);
}

// create wind and sun directories if they don't exist
if (!fs.existsSync('./sun')){
    fs.mkdirSync('./sun');
}
if (!fs.existsSync('./wind')){
    fs.mkdirSync('./wind');
}

app.get('/', async function (req, res) {
    res.status(200).set('Content-Type','text/plain').send("This is the public-data-synchronization service. If you want to update the data repository, please send a POST request with a single JSON file containing the updated data to this URL.");
    return;
});

app.post('/', async function (req, res) {
    let reqCheck = await validateReq(req);
    if (reqCheck.status !== 200) {
        res.status(reqCheck.status).set('Content-Type','text/plain').send("Invalid project data: " + reqCheck.msg);
        return;
    }
    else {
        const fileName = req.body['type'] + '/' + req.body['id'];
        fs.writeFile(path.join(__dirname, fileName), JSON.stringify(req.body), async function (err, file) {
            if (err) {
                res.status(500).set('Content-Type','text/plain').send(err);
                return;
            }
            else {
                pushChanges({'method':'post','file':fileName}, resp => {
                    res.status(resp.status).set('Content-Type','text/plain').send(resp.msg);
                });
            }
        });
    }
});

app.listen(port, host, function () {
  console.log('Example app listening on ' + host + ':' + port);
});

function validateReq(req) {
    if (typeof req.body !== "object" || req.body === null) {
      return {'status': 400, 'msg': 'could not read body'};
    }
    if (typeof req.body['id'] !== "string" || req.body['id'].length < 1) {
      return {'status': 400, 'msg': 'missing id'};
    }
    if (!(req.body['type'] === 'sun' || req.body['type'] === 'wind')) {
      return {'status': 400, 'msg': 'incompatible type (possible values wind/sun)'};
    }
    return {'status': 200, 'msg': 'okay'};
}

async function pushChanges(event) {
    if (typeof event.method !== 'string' || typeof event.file !== 'string') {
        console.log("Invalid call of pushChanges");
        return {'status':500, 'msg': 'Invalid event'};
    }
    if (event.method === 'post') {
        const addProc = spawn('./gitControl.sh', ['post', event.file, "-t", config.access_token, "-r", config.repository]);
        addProc.stdout.on('data', data => console.log(`stdout: ${data}`));
        addProc.stderr.on('data', data => console.log(`stderr: ${data}`));
        addProc.on('error', (error) => {
            return {'status':500,'msg':error.message};
        });
        addProc.on('close', code => {
            if (code !== 0) {
                return {'status':500,'msg':'commiting changes failed'};
            }
            else {
                return {'status':200,'msg':'okay'};
            }
        });
    }
    else {
        return {'status':500, 'msg': 'Unkown method: ' + event.method};
    }
}
