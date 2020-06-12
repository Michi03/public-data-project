const {spawn} = require("child_process");
const error = require('./util.js').error;

var projects = [];

function pushChanges(event, args) {
    if (typeof event.files !== 'string' || typeof event.handle === 'undefined' || typeof args.gitToken === "undefined" || typeof args.repoUrl === "undefined") {
        error("Invalid call of pushChanges");
        event.handle.status(500).set('Content-Type','text/plain').send("Internal server error!");
        return;
    }
    let commitMessage, okayMessage;
    if (event.method === 'post') {
        commitMessage = `"Added ${event.files}"`;
        okayMessage = 'Successfully created project';
    }
    if (event.method === 'patch') {
        commitMessage = `"Updated ${event.files}"`;
        okayMessage = 'Successfully updated project';
    }
    if (event.method === 'delete') {
        commitMessage = `"Removed ${event.files}"`;
        okayMessage = 'Successfully removed project';
    }
    const addProc = spawn('./gitControl.sh', ["-t", args.gitToken, "-r", args.repoUrl, "-m", commitMessage, "-f", event.files, "-p", event.type]);
    addProc.stdout.on('data', data => console.log(`stdout: ${data}`));
    addProc.stderr.on('data', data => console.log(`stderr: ${data}`));
    addProc.on('error', (err) => {
        event.handle.status(500).set('Content-Type','text/plain').send("Commiting changes failed with: " + err.message);
        return;
    });
    addProc.on('exit', code => {
        if (code !== 0) {
            event.handle.status(500).set('Content-Type','text/plain').send("Commiting changes failed with code: " + code);
            return;
        }
        else {
            event.handle.status(200).set('Content-Type','text/plain').send(okayMessage);
            return;
        }
    });
}

function reset(type) {
    if (type !== "sun" && type !== "wind") {
        error('Invalid call to reset: type has to be either sun or wind');
        return;
    }
    const addProc = spawn('./gitControl.sh', ["-x", "-p", type]);
    addProc.stdout.on('data', data => console.log(`stdout: ${data}`));
    addProc.stderr.on('data', data => console.log(`stderr: ${data}`));
    addProc.on('error', (err) => {
        error('Resetting repo failed with: ' + err.message);
        return;
    });
    addProc.on('exit', code => {
        if (code !== 0) {
            error('Resetting repo failed with code ' + code);
            return;
        }
    });
}

module.exports = {pushChanges, reset};
