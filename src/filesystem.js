const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const path = require('path');
const ignore = require('./util.js').ignore;

const ROOT = path.join(__dirname, '..');
var projectPaths = {};

async function getDirTree() {
    return await createDirTree(path.join(ROOT, '..'), {});
}

async function createDirTree(root, dirTree) {
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
            if (typeof dirTree[file] !== 'undefined' || ignore(file))
                continue;
            dirTree[file] = {};
            if (fs.lstatSync(path.join(root,file)).isDirectory()) {
                let subTree = await createDirTree(path.join(root,file), {});
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

async function createProject(data) {
    let files = parseJson(data);
    if (files.status !== 200) {
        return files;
    }
    else {
        files = files.msg;
    }
    if (typeof projectPaths[files.id] !== 'undefined'){
        return {'status': 400, 'msg': "Project already exists"};
    }
    let keys = Object.keys(files);
    let projectDir = path.join(ROOT, files.path);
    try {
        fs.mkdirSync(projectDir);
    } catch (err) {
        return {'status': 500, 'msg': err};
    }
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === 'path' || keys[i] === 'id')
            continue;
        if (keys[i].length > 3 && keys[i].substr(keys[i].length - 3) === 'CSV')
        {
            await writeFile(path.join(projectDir, `${keys[i].substr(0, keys[i].length - 3)}.csv`), files[keys[i]], err => { return {'status': 500, 'msg': err} });
        }
        else {
            await writeFile(path.join(projectDir, `${keys[i]}.json`), files[keys[i]], err => { return {'status': 500, 'msg': err} });
        }
    }
    projectPaths[files.id] = files.path;
    return {'status': 200, 'msg': path.join(projectDir,'*')};
}

function updateProject(data) {
    // TODO fix
    return new Promise(resolve => {
        let files = [];
        if (typeof projectPaths[files.id] === 'undefined'){
            resolve({'status': 404, 'msg': 'Project does not exists'});
            return;
        }
        fs.readFile(path.join(ROOT, fileName), 'utf8', function (err, data) {
            if (err) {
                resolve({'status': 500, 'msg': err});
                return;
            }
            let result = JSON.parse(data);
            Object.keys(project).forEach(key => result[key] = project[key]);
            resolve({'status': 200, 'msg': result});
        });
    })
    fs.writeFile(path.join(ROOT, fileName), JSON.stringify(req.body), function (err, file) {
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
    if (typeof projectPaths[files.id] === 'undefined'){
        return {'status': 400, 'msg': "Project does not exists"};
    }
    fs.unlink(path.join(ROOT, fileName), function (err) {
        if (err) {
            return {'status': 500, 'msg': err};
        }
        else {
            return {'status': 200, 'msg': {'files': files}};
        }
    });
}

function parseJson(raw) {
    if (typeof raw.id === 'undefined' ||  typeof raw.name === 'undefined' || typeof raw.params === 'undefined' || (raw.type !== 'wind' && raw.type !== 'sun'))
        return {'status': 400, 'msg': "Invalid project data"};
    let res = {'id': raw.id, 'path': path.join(raw.type,raw.name)};
    let keys = Object.keys(raw.params);
    for (let i = 0; i < keys.length; i++) {
        res[keys[i]] = raw.params[keys[i]];
    }
    return {'status': 200, 'msg': res};
}

module.exports = {getDirTree, updateProject, deleteProject, createProject};
