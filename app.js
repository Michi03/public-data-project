// includes
const app = require('express')();
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const {spawn} = require("child_process");
app.use(bodyParser.json({limit:'100mb'}));



// exit codes
const SUCCESS = 0;
const INVALID_ARGUMENT = 1;
const MISSING_ARGUMENT = 2;

// config values
var port = 2201;
var host = "0.0.0.0";
var repoUrl = "github.com/Michi03/public-data-project";
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
    case '--repo':
        if (typeof args[i+1] === 'undefined') {
            console.log('--repo requires an argument');
            process.exit(INVALID_ARGUMENT);
        }
        else
            repoUrl = args[i+1];
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

if (!gitToken) {
    console.log("Missing argument: --token");
    process.exit(MISSING_ARGUMENT);
}

app.get('/', async function (req, res) {
    let dirTree = await createDirTree(__dirname, {}, ['.git','.gitignore','node_modules']);
    if (dirTree.status !== 200) {
        res.status(dirTree.status).set('Content-Type','text/plain').send("Failed to create directory tree: " + dirTree.data);
        return;
    }
    res.status(dirTree.status).set('Content-Type','text/json').send(dirTree.data);
    console.log(dirTree);
    return;
});

app.post('/', async function (req, res) {
    const reqCheck = await validateReq(req);
    if (reqCheck.status !== 200) {
        res.status(reqCheck.status).set('Content-Type','text/plain').send("Invalid request: " + reqCheck.msg);
        return;
    }
    const type = req.body['type'] + "flower_projects";
    const fileName = type + '/' + req.body['id'] + '.json';
    if (fs.existsSync(path.join(__dirname, fileName))){
        res.status(500).set('Content-Type','text/plain').send("Project already exists");
        return
    }
    fs.writeFile(path.join(__dirname, fileName), JSON.stringify(req.body), function (err, file) {
        if (err) {
            res.status(500).set('Content-Type','text/plain').send(err);
            return;
        }
        else {
            pushChanges({'method':'post','file':fileName,'handle':res});
        }
    });
});

app.patch('/', async function (req, res) {
    const reqCheck = await validateReq(req);
    if (reqCheck.status !== 200) {
        res.status(reqCheck.status).set('Content-Type','text/plain').send("Invalid project data: " + reqCheck.msg);
        return;
    }
    const type = req.body['type'] + "flower_projects";
    const fileName = type + '/' + req.body['id'] + '.json';
    let updateRes = await updateProject(fileName, req.body);
    if (updateRes.status !== 200) {
        res.status(updateRes.status).set('Content-Type','text/plain').send(updateRes.data);
        return;
    }
    fs.writeFile(path.join(__dirname, fileName), JSON.stringify(req.body), function (err, file) {
        if (err) {
            res.status(500).set('Content-Type','text/plain').send(err);
            return;
        }
        else {
            pushChanges({'method':'patch','file':fileName,'handle':res});
        }
    });
});

app.delete('/', async function (req, res) {
    const reqCheck = await validateReq(req);
    if (reqCheck.status !== 200) {
        res.status(reqCheck.status).set('Content-Type','text/plain').send("Invalid project data: " + reqCheck.msg);
        return;
    }
    const type = req.body['type'] + "flower_projects";
    const fileName = type + '/' + req.body['id'] + '.json';
    if (!fs.existsSync(path.join(__dirname, fileName))){
        res.status(500).set('Content-Type','text/plain').send("Project does not exists");
        return
    }
    fs.unlink(path.join(__dirname, fileName), function (err) {
        if (err) {
            res.status(400).set('Content-Type','text/plain').send(err);
            return;
        }
        else {
            pushChanges({'method':'delete','file':fileName,'handle':res});
        }
    });
});

app.listen(port, host, function () {
  console.log('Example app listening on ' + host + ':' + port);
});

function validateReq(req) {
    if (typeof req.header('Content-Type') !== 'string' || req.header('Content-Type').toLowerCase() !== 'application/json') {
      return {'status': 400, 'msg': 'only application/json is accepted as content-type'};
    }
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

function pushChanges(event) {
    if (typeof event.file !== 'string' || typeof event.handle === 'undefined') {
        console.log("Invalid call of pushChanges");
        event.handle.status(500).set('Content-Type','text/plain').send("Internal server error!");
        return;
    }
    let commitMessage, okayMessage;
    if (event.method === 'post') {
        commitMessage = `"Added file ${event.file}"`;
        okayMessage = 'Successfully created project ' + event.file;
    }
    if (event.method === 'patch') {
        commitMessage = `"Updated file ${event.file}"`;
        okayMessage = 'Successfully updated project ' + event.file;
    }
    if (event.method === 'delete') {
        commitMessage = `"Removed file ${event.file}"`;
        okayMessage = 'Successfully removed project ' + event.file;
    }
    const addProc = spawn('./gitControl.sh', ["-t", gitToken, "-r", repoUrl, "-f", event.file, "-m", commitMessage]);
    addProc.stdout.on('data', data => console.log(`stdout: ${data}`));
    addProc.stderr.on('data', data => console.log(`stderr: ${data}`));
    addProc.on('error', (error) => {
        event.handle.status(500).set('Content-Type','text/plain').send(error.message);
        return;
    });
    addProc.on('exit', code => {
        if (code !== 0) {
            event.handle.status(500).set('Content-Type','text/plain').send("commiting changes failed");
            return;
        }
        else {
            event.handle.status(200).set('Content-Type','text/plain').send(okayMessage);
            return;
        }
    });
}

function updateProject(fileName, project) {
    return new Promise(resolve => {
        if (!fs.existsSync(path.join(__dirname, fileName))){
            resolve({'status': 404, 'data': 'Project does not exists'});
            return;
        }
        fs.readFile(path.join(__dirname, fileName), 'utf8', function (err, data) {
            if (err) {
                resolve({'status': 500, 'data': err});
                return;
            }
            let result = JSON.parse(data);
            Object.keys(project).forEach(key => result[key] = project[key]);
            resolve({'status': 200, 'data': result});
        });
    })
}

async function createDirTree(root, dirTree, except) {
    const stats = fs.lstatSync(root);
    if (stats.isDirectory()) {
        let files;
        try {
            files = await readdir(root);
        } catch (err) {
            return {'status': 500, data: err};
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (typeof dirTree[file] !== 'undefined' || except.includes(file))
                continue;
            dirTree[file] = {};
            if (fs.lstatSync(path.join(root,file)).isDirectory()) {
                let subTree = await createDirTree(path.join(root,file), {}, except);
                if (subTree.status === 200)
                    dirTree[file] = subTree.data;
                else
                    return subTree;
            }
        }
        return {'status': 200, 'data': dirTree};
    }
    else {
        return {'status': 500, data: "Invalid call to createDirTree: " + root + " is not a directory"};
    }
}
