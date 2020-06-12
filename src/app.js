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
    git.pushChanges({'method':'post','files':tempRes.msg,'handle':res,'type':req.body.type}, args);
});

app.patch('/', async function (req, res) {
    res.status(503).set('Content-Type','text/plain').send("I'm sorry, this route is currently not avaialable. Please try again, later.");
/*    util.log(req);
    let tempRes = await util.validateReq(req);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Invalid request: " + tempRes.msg);
        return;
    }
    tempRes = await fs.updateProject(req.body);
    if (tempRes.status !== 200) {
        git.reset();
        res.status(tempRes.status).set('Content-Type','text/plain').send("Failed updating project: " + tempRes.msg);
        return;
    }
    git.pushChanges({'method':'patch','files':tempRes.msg,'handle':res,'type':req.body.type}, args);*/
});

app.delete('/', async function (req, res) {
    util.log(req);
    let tempRes = await util.validateReq(req);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Invalid request: " + tempRes.msg);
        return;
    }
    tempRes = await fs.deleteProject(req.query.id);
    if (tempRes.status !== 200) {
        res.status(tempRes.status).set('Content-Type','text/plain').send("Failed deleting project: " + tempRes.msg);
        return;
    }
    git.pushChanges({'method':'delete','files':tempRes.path,'handle':res,'type':tempRes.type}, args);
});

app.listen(args.port, args.host, function () {
  console.log('Example app listening on ' + args.host + ':' + args.port);
});
