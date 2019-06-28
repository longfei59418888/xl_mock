const argv = require('yargs').argv
const express = require('express')
const app = express();
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const {cat, mkdir, find} = require('shelljs')
var session = require('express-session');   //中间件
var bodyParser = require('body-parser');        //post参数解析
var Mock = require('mockjs')
const opn = require('opn');

const sliptor = '______'
const catInfo = 'cat___info___list.txt'

// 解析 application/json
app.use(bodyParser.json({limit: '50mb'}));
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false, limit: '50mb'}));

app.set('views', path.join(__dirname, './tpl'));
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

let mockDataDir = __dirname
if (!fs.existsSync(path.join(__dirname, '../bin/tpl'))) {
    mockDataDir = path.join(process.cwd(), './mock')
}
const dataDir = path.join(mockDataDir, './data')

app.use("/index.html", (req, res) => {
    let cate = getCate(dataDir)
    let apiList = getCate(path.join(dataDir, '0000000000'))
    let currentApi = {};

    let apiLists = apiList.map(item => {
        item = JSON.parse(item.name)
        const newItem = Object.assign({}, item)
        delete newItem.list
        return newItem
    })
    res.render('index.html', {title: 'index', cate, apiLists, currentApi});
});

function getDir(pathName) {
    let list = fs.readdirSync(pathName);
    list = list.filter((item) => {
        let temp = path.join(pathName, item);
        if (fs.statSync(temp).isDirectory()) return true
        else return false
    })
    return list
}

function getCate(pathName) {
    let list = getDir(pathName)
    list = list.sort().reverse()
    list = list.map(item => {
        let temp = path.join(pathName, item, catInfo);
        return {
            id: item,
            name: cat(temp),
        }
    })
    return list
}

function getAll() {
    let all = []
    let list = getDir(dataDir)
    list.forEach(item => {
        let temp = path.join(dataDir, item);
        let lists = getCate(temp)
        all = all.concat(lists)
    })
    return all
}

function formatePath(url) {
    url = url.replace(/\s/, '').split('/')
    url = url.map(item => {
        if (/^:.+/.test(item)) return sliptor
        else return item
    })
    return url.join('/')
}

function delDir(path) {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) {
                delDir(curPath); //递归删除文件夹
            } else {
                fs.unlinkSync(curPath); //删除文件
            }
        });
        fs.rmdirSync(path);
    }
}


app.use((req, res, next) => {
    var origin = req.headers.origin ? req.headers.origin : true;
    res.setHeader('Access-Control-Allow-Origin', origin);//注意这里不能使用 *
    res.setHeader('Access-Control-Allow-Credentials', true);//告诉客户端可以在HTTP请求中带上Cookie
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    next()
});
app.use("/___api/cate/add", (req, res) => {
    let {name} = req.body;
    const time = new Date().getTime() + ''
    if (fs.existsSync(path.join(dataDir, name)) && fs.statSync(path.join(dataDir, name)).isDirectory()) {
        res.end(JSON.stringify({
            code: '0001',
            msg: '当前分类已存在！'
        }))
        return
    }
    fs.mkdirSync(path.join(dataDir, time))
    res.end(JSON.stringify({
        code: '0',
        data: {
            id: time,
            name
        },
        msg: '添加分类成功！'
    }))
    fs.writeFileSync(path.join(dataDir, time, catInfo), name, 'utf8')

});
app.use("/___api/cate/get", (req, res) => {
    let {id} = req.body;


    let apiList = getCate(path.join(dataDir, id))
    let currentApi = {};
    let apiLists = apiList.map(item => {
        item = JSON.parse(item.name)
        const newItem = Object.assign({}, item)
        delete newItem.list
        return newItem
    })
    res.end(JSON.stringify({
        code: '0',
        data: apiLists,
        msg: ""
    }))

});
app.use("/___api/list/add", (req, res) => {
    let reqBody = JSON.parse(req.body.data)
    let {apiName = '', apiUrl = '', apiDesp = '', apiMethod = '', list = [], cateId = '', id = '', jsonData = '', json} = reqBody;
    if (apiUrl.substr(0, 1) != '/') apiUrl = '/' + apiUrl
    let saveData = {apiName, apiDesp, apiMethod, list, cateId, id, apiUrl, jsonData, json}
    let cate = path.join(dataDir, cateId);
    let dataList = getDir(cate)
    let nameTime = new Date().getTime() + ''
    let isHasApi = dataList.some(item => item = id)
    let all = getAll();
    let isHasUrl = all.some(item => {
        item = JSON.parse(item.name)
        return formatePath(item.apiUrl) == formatePath(apiUrl) && item.apiMethod == apiMethod
    })
    if (isHasApi) {
        nameTime = id + ''
        fs.writeFileSync(path.join(cate, nameTime, catInfo), JSON.stringify(saveData), 'utf8')
        saveData.save = true
        res.end(JSON.stringify({
            code: '0',
            data: saveData,
            msg: '修改接口成功！'
        }))
    } else {
        let catList = getCate(cate)
        let isHas = catList.some(item => {
            item = JSON.parse(item.name)
            return item.apiName == apiName
        })
        if (isHasUrl) {
            res.end(JSON.stringify({
                code: '0001',
                msg: '接口已经存在！'
            }))
            return
        }
        if (isHas) {
            res.end(JSON.stringify({
                code: '0001',
                msg: '接口已经存在！'
            }))
            return
        }
        fs.mkdirSync(path.join(cate, nameTime))
        saveData.id = nameTime
        fs.writeFileSync(path.join(cate, nameTime, catInfo), JSON.stringify(saveData), 'utf8')
        res.end(JSON.stringify({
            code: '0',
            data: saveData,
            msg: '添加接口成功！'
        }))
    }
});
app.use("/___api/list/get", (req, res) => {
    let {id, apiUrl} = req.body;
    let dataJson = JSON.parse(cat(path.join(dataDir, id, apiUrl, catInfo)))
    res.end(JSON.stringify({
        code: '0',
        data: dataJson,
        msg: ""
    }))
});
app.use("/___api/list/delete", (req, res) => {
    let {id, cateId} = req.body;
    if (!id || !cateId) {
        res.end(JSON.stringify({
            code: '0001',
            data: {},
            msg: "删除失败！"
        }))
        return
    }
    const dataPath = path.join(dataDir, cateId, id)
    if (fs.existsSync(dataPath) && fs.statSync(dataPath).isDirectory()) {
        delDir(dataPath)
        res.end(JSON.stringify({
            code: '0',
            data: {},
            msg: "删除成功！"
        }))
    } else {
        res.end(JSON.stringify({
            code: '0001',
            data: {},
            msg: "删除失败！"
        }))
    }

});
app.use("/___api/cate/delete", (req, res) => {
    let {id} = req.body;
    if (!id) {
        res.end(JSON.stringify({
            code: '0001',
            data: {},
            msg: "删除失败！"
        }))
        return
    }
    const dataPath = path.join(dataDir, id)
    if (fs.existsSync(dataPath) && fs.statSync(dataPath).isDirectory()) {
        delDir(dataPath)
        res.end(JSON.stringify({
            code: '0',
            data: {},
            msg: "删除成功！"
        }))
    } else {
        res.end(JSON.stringify({
            code: '0001',
            data: {},
            msg: "删除失败！"
        }))
    }
})
app.use("/*", (req, res) => {
    let {originalUrl, method} = req

    let allData = getAll();
    let currentData = null
    allData.forEach(item => {
        item = JSON.parse(item.name)
        let apiUrl = formatePath(item.apiUrl)
        apiUrl = apiUrl.replace(sliptor, '[^/]+?')
        if (new RegExp(`^${apiUrl}$`).test(originalUrl) && item.apiMethod == method.toLowerCase()) {
            currentData = item
        }
    })
    if (!currentData) {
        res.end(JSON.stringify({
            code: '2',
            data: {},
            msg: "接口不存在"
        }))
        return
    }
    var data = currentData.json
    if(!data || data == '') data = Mock.mock(getMockData(currentData.list))
    res.end(JSON.stringify({
        code: '0',
        data: data,
        msg: ""
    }))
});
let port = argv.p ? argv.p : 2047
app.listen(port, '0.0.0.0', () => {
    opn(`http://127.0.0.1:${port}/index.html`);
    console.log(`http://127.0.0.1:${port}/index.html`)
});

function getMockData(list) {
    var obj = {}

    function setMock(item, obj) {
        var name = item.name,
            type = item.type,
            son = item.son,
            spec = item.spec,
            val = item.val;
        // debugger
        switch (type) {
            case 'string':
                // 字符串 / 日期 / 图片
                if (!spec) spec = '7,10';
                spec = spec.split(',');
                var _value;
                if (spec[0] == 'date') {
                    _value = '@date';
                } else if (spec[0] == 'time') {
                    _value = '@time';
                } else if (spec[0] == 'datetime') {
                    _value = '@datetime';
                } else if (spec[0] == 'image') {
                    _value = Random.image(spec[1]);
                } else {
                    _value = '@string(' + spec[0] + ', ' + spec[1] + ')';
                }
                obj[name] = val ? val : _value;
                break;
            case 'number':
                // 整数和浮点数
                if (!spec) spec = '1,100,integer';
                spec = spec.split(',');
                var _value = '@integer(' + spec[0] + ', ' + spec[1] + ')';
                if (spec[2] == 'float') {
                    _value = '@float(' + spec[0] + ', ' + spec[1] + ')';
                }
                obj[name] = val ? val : _value;
                break;
            case 'boolean':
                obj[name] = val ? val : '@boolean';
                break;
            case 'object':
                obj[name] = {}
                son.forEach(function (item) {
                    setMock(item, obj[name]);
                });
                break;
            case 'array[number]':
                if (!spec) spec = '10';
                spec = spec.split(',');
                obj[name] = `@range(${spec})`;
                break;
            case 'array[string]':
                if (!spec) spec = '10,3,5';
                spec = spec.split(',');
                var list = [];
                for (var i = 0; i < spec[0]; i++) {
                    list.push(Mock.mock(`@string(${spec[1]}, ${spec[2]})`))
                }
                obj[name] = val ? val : list;
                break;
            case 'array[object]':
                if (!spec) spec = '10,5,10';
                spec = spec.split(',');
                var arrayObj = {}
                son.forEach(function (item) {
                    setMock(item, arrayObj);
                });
                obj[name + '|' + spec[0]] = [arrayObj];
                break;
            case 'array[array]':
                if (!spec) spec = '3,5,10';
                spec = spec.split(',');
                var arrayObj = {}
                son.forEach(function (item) {
                    setMock(item, arrayObj);
                });
                obj[name + '|' + spec[0]] = [arrayObj];
                break;
        }
    }

    list.forEach(function (item) {
        setMock(item, obj)
    })
    return obj
}
