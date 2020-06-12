const fs = require('fs');
const util = require('util');
const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const removeDir = require("rimraf");
const path = require('path');
const ignore = require('./util.js').ignore;

const ROOT = path.join(__dirname, '..');
var projects = {};

async function getDirTree(depth) {
    if (typeof depth === 'string')
        depth = Number(depth);
    return await createDirTree(ROOT, {}, depth);
}

async function createDirTree(root, dirTree, depth) {
    if (depth === 0) {
        return {'status': 200, data: dirTree};
    }
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
                let subTree = await createDirTree(path.join(root,file), {}, depth - 1);
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
    let keys = Object.keys(files);
    let projectDir = path.join(ROOT, files.projectDir);
    let fullPath = path.join(ROOT, files.path);
    if (!fs.existsSync(projectDir)){
        try {
            fs.mkdirSync(projectDir);
        } catch (err) {
            return {'status': 500, 'msg': err};
        }
    }
    try {
        fs.mkdirSync(fullPath);
    } catch (err) {
        return {'status': 500, 'msg': err};
    }
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === 'path' || keys[i] === 'id' || keys[i] === 'projectDir')
            continue;
        if (keys[i].length > 3 && keys[i].substr(keys[i].length - 3) === 'CSV')
        {
            await writeFile(path.join(fullPath, `${keys[i].substr(0, keys[i].length - 3)}.csv`), files[keys[i]], err => { return {'status': 500, 'msg': err} });
        }
        else if (keys[i].length > 3 && keys[i].substr(keys[i].length - 3) === 'EPW')
        {
            await writeFile(path.join(fullPath, `${keys[i].substr(0, keys[i].length - 3)}.epw`), files[keys[i]], err => { return {'status': 500, 'msg': err} });
        }
        else {
            await writeFile(path.join(fullPath, `${keys[i]}.json`), JSON.stringify(files[keys[i]]), err => { return {'status': 500, 'msg': err} });
        }
    }
    projects[files.id] = {'path': files.projectDir, 'type': data.type};
    return {'status': 200, 'msg': path.join(fullPath,'*')};
}

async function updateProject(data) {
    let files = "";
    let fileNames = Object.keys(data);
    for (let i = 0; i < fileNames.length; i++) {
        let fileName = path.join(ROOT, fileNames[i]);
        if (fs.existsSync(fileName)) {
            await fs.writeFile(fileName, JSON.stringify(data[fileNames[i]]), err => { return {'status': 500, 'msg': err} });
            files += ' ' + fileName;
        }
        else
            return {'status': 404, 'msg': fileNames[i] + ' not found'};
    }
    if (files[0] === ' ')
        files = files.substr(1);
    return {'status': 200, 'msg': files};
}

async function deleteProject(id) {
    let files = [];
    if (typeof projects[id] === 'undefined') {
        return {'status': 404, 'msg': "Project " + id + " not found"};
    }
    let projectPath = path.join(ROOT, projects[id].path);
    let projectType = projects[id].type;
    await removeDir(projectPath, function (err) {
        if (err) {
            return {'status': 500, 'msg': err};
        }
    });
    return {'status': 200, 'path': projectPath, 'type': projectType};
}

function parseJson(raw) {
    if (typeof raw.id === 'undefined' ||  typeof raw.name !== 'string' || typeof raw.parameters === 'undefined' || (raw.type !== 'wind' && raw.type !== 'sun'))
        return {'status': 400, 'msg': "Invalid project data"};
    let d = new Date();
    let projectDir = path.join(raw.type, raw.name.replace(/ /g, '_'));
    let res = {'id': raw.id, 'projectDir': projectDir, 'path': path.join(projectDir, d.toJSON())};
    let keys = Object.keys(raw.parameters);
    for (let i = 0; i < keys.length; i++) {
        res[keys[i]] = raw.parameters[keys[i]];
    }
    return {'status': 200, 'msg': res};
}

module.exports = {getDirTree, updateProject, deleteProject, createProject};
