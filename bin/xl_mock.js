#!/usr/bin/env node

var path = require('path');
var argv = require('yargs').argv
var program = require('commander')
var shell = require('shelljs')
var tag = require('../lib/tag.js')
var start = require('../lib/start.js')
const opn = require('opn');
// 如果存在本地的命令，执行本地的
try {
    var localWebpack = require.resolve(path.join(process.cwd(), "node_modules", "xl_mock", "bin", "xl_mock.js"));
    if (__filename !== localWebpack) {
        return require(localWebpack);
    }
} catch (e) {
}


let package = JSON.parse(shell.cat(path.join(__dirname, '../package.json')))


program
    .version(package.version)
    .usage('[cmd] [options]')
    .option('-p', '配置端口号')
    .option('-d', '配置mock目录名称 ，默认 mock')
    .option('-x', '设置密码')
program
    .command('start')
    .description('开启mock服务器..')
    .action((path, options) => {
        start(argv)
    })
program
    .command('add <path>')
    .description('添加 mock 数据..')
    .action((path) => {
        opn(`http://127.0.0.1:${port}/index.html`,{app: 'google chrome'});
    })
program.parse(process.argv)
