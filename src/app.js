// includes
const path = require('path');
const app = require('express')();
const bodyParser = require('body-parser');
app.use(bodyParser.json({limit:'100mb'}));

const fs = require('./filesystem.js');
const util = require('./util.js');
const git = require('./gitControl.js');

// config values
const args = util.parseArgs(process.argv.slice(2));

app.get('/', async function (req, res) {
    util.log(req);
    let dirTree = await fs.getDirTree(req.query['recursive']);
    if (dirTree.status !== 200) {
        res.status(dirTree.status).set('Content-Type','text/plain').send("Failed to create directory tree: " + dirTree.data);
        return;
    }
    res.status(dirTree.status).set('Content-Type','application/json').send(dirTree.data);
    return;
});

app.post('/', async function (req, res) {
    util.log(req);
    let tempRes = await util.validateReq(req);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Invalid request: " + tempRes.msg);
        return;
    }
    tempRes = await fs.createProject(req.body);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Failed creating project: " + tempRes.msg);
        return;
    }
    git.pushChanges({'method':'post','files':tempRes.msg,'handle':res}, args);
});

app.patch('/', async function (req, res) {
    util.log(req);
    let tempRes = await util.validateReq(req);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Invalid request: " + tempRes.msg);
        return;
    }
    tempRes = await fs.updateProject(req.body);
    if (updateRes.status !== 200) {
        git.reset();
        res.status(updateRes.status).set('Content-Type','text/plain').send("Failed updating project: " + tempRes.msg);
        return;
    }
    git.pushChanges({'method':'patch','files':tempRes.msg,'handle':res}, args);
});

app.delete('/', async function (req, res) {
    util.log(req);
    let tempRes = await util.validateReq(req);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Invalid request: " + tempRes.msg);
        return;
    }
    tempRes = await fs.deleteProject(req.body);
    if (updateRes.status !== 200) {
        res.status(updateRes.status).set('Content-Type','text/plain').send("Failed deleting project: " + tempRes.msg);
        return;
    }
    git.pushChanges({'method':'delete','files':tempRes.msg['files'],'handle':res});
});

app.listen(args.port, args.host, function () {
  console.log('Example app listening on ' + args.host + ':' + args.port);
});
