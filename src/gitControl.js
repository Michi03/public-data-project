const {spawn} = require("child_process");

var projects = [];

function pushChanges(event, args) {
    if (typeof event.files !== 'string' || typeof event.handle === 'undefined' || typeof args.gitToken === "undefined" || typeof args.repoUrl === "undefined") {
        console.log("Invalid call of pushChanges");
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
    const addProc = spawn('./gitControl.sh', ["-t", args.gitToken, "-r", args.repoUrl, "-m", commitMessage, "-f", event.files]);
    addProc.stdout.on('data', data => console.log(`stdout: ${data}`));
    addProc.stderr.on('data', data => console.log(`stderr: ${data}`));
    addProc.on('error', (error) => {
        event.handle.status(500).set('Content-Type','text/plain').send("Commiting changes failed with: " + error.message);
        return;
    });
    addProc.on('exit', code => {
        if (code !== 0) {
            event.handle.status(500).set('Content-Type','text/plain').send("Commiting changes failed");
            return;
        }
        else {
            event.handle.status(200).set('Content-Type','text/plain').send(okayMessage);
            return;
        }
    });
}

module.exports = {pushChanges};
