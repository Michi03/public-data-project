const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const path = require('path');

const IGNORE = ['.git', '.gitignore', 'node_modules'];

var dirTree = {};

async function getDirTree() {
    if (Object.keys(dirTree).length < 1) {
        dirTree = await createDirTree(path.join(__dirname, '..'), dirTree, IGNORE);
    }
    return dirTree;
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

function createProject(data) {
    let files = [];
    // TODO fix
    if (fs.existsSync(path.join(__dirname, fileName))){
        return {'status': 500, 'msg': "Project already exists"};
    }
    fs.writeFile(path.join(__dirname, fileName), JSON.stringify(data), function (err, file) {
        if (err) {
            return {'status': 500, 'msg': err};
        }
    });
    return {'status': 200, 'msg': {'files': files}};
}

function updateProject(data) {
    // TODO fix
    return new Promise(resolve => {
        let files = [];
        if (!fs.existsSync(path.join(__dirname, fileName))){
            resolve({'status': 404, 'msg': 'Project does not exists'});
            return;
        }
        fs.readFile(path.join(__dirname, fileName), 'utf8', function (err, data) {
            if (err) {
                resolve({'status': 500, 'msg': err});
                return;
            }
            let result = JSON.parse(data);
            Object.keys(project).forEach(key => result[key] = project[key]);
            resolve({'status': 200, 'msg': result});
        });
    })
    fs.writeFile(path.join(__dirname, fileName), JSON.stringify(req.body), function (err, file) {
        if (err) {
            return {'status': 500, 'msg': err};
        }
        else {
            return {'status': 200, 'msg': {'files': files}};
        }
    });
}

function deleteProject(id) {
    // TODO fix
    let files = [];
    if (!fs.existsSync(path.join(__dirname, fileName))){
        return {'status': 400, 'msg': "Project does not exists"};
    }
    fs.unlink(path.join(__dirname, fileName), function (err) {
        if (err) {
            return {'status': 500, 'msg': err};
        }
        else {
            return {'status': 200, 'msg': {'files': files}};
        }
    });
}

module.exports = {getDirTree, updateProject, deleteProject, createProject};
