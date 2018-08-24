const argv = require('yargs').argv
const express = require('express')
const app = express();
const ejs  = require('ejs');
const fs  = require('fs');
const path  = require('path');
const { cat,mkdir } = require('shelljs')
var session = require('express-session');   //中间件
var bodyParser = require('body-parser');        //post参数解析
var Mock = require('mockjs')

// 解析 application/json
app.use(bodyParser.json({limit: '50mb'}));
// 解析 application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false , limit: '50mb' }));

app.set('views', path.join(__dirname,'./tpl'));
app.engine('.html', ejs.__express);
app.set('view engine', 'html');

app.use("/index.html", (req, res) => {
    let data = JSON.parse(cat(path.join(__dirname,'./data/index.json')))
    let apiList = JSON.parse(cat(path.join(__dirname,'./data/0.json')))
    let apiLists=[],currentApi;
    for(var item in apiList){
        if(!currentApi) currentApi= apiList[item]
        delete apiList[item].list
        apiLists.push(apiList[item])
    }
    res.render('index.html', {title:'index',cate:data.cate,apiLists,currentApi});
});

const sliptor = '______'
app.use( (req, res,next) => {
    var origin = req.headers.origin ? req.headers.origin :true;
    res.setHeader('Access-Control-Allow-Origin', origin);//注意这里不能使用 *
    res.setHeader('Access-Control-Allow-Credentials', true);//告诉客户端可以在HTTP请求中带上Cookie
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    next()
});
app.use("/___api/cate/add", (req, res) => {
    let data = JSON.parse(cat(path.join(__dirname,'./data/index.json')))
    let { name } = req.body;
    if(data.cateName.indexOf(name) != -1){
        res.end(JSON.stringify({
            code:'0001',
            msg:'当前分类已存在！'
        }))
        return
    }
    let cate = {name,id:data.cate.length}
    data.cate.push(cate)
    data.cateName.push(name)
    fs.writeFile(path.join(__dirname,'./data/index.json'), JSON.stringify(data), 'utf8', (err, rst)=>{
        if (err) {
            console.error(path+' is not fond');
            process.exitCode = 1;
            return;
        }
        fs.writeFile(path.join(__dirname,'./data/'+(data.cate.length-1)+'.json'), '{}', 'utf8', (err, rst)=>{
            if (err) {
                console.error(path+' is not fond');
                process.exitCode = 1;
                return;
            }
            res.end(JSON.stringify({
                code:'0',
                data:cate,
                msg:'添加分类成功！'
            }))
        })
    });

});
app.use("/___api/cate/get", (req, res) => {
    let { id } = req.body;
    let dataJson = JSON.parse(cat(path.join(__dirname,`./data/${id}.json`))),
        dataArray = []
    for(var item in dataJson){
        delete dataJson[item].list
        dataArray.push(dataJson[item])
    }
    res.end(JSON.stringify({
        code:'0',
        data:dataArray,
        msg:""
    }))

});
app.use("/___api/list/add", (req, res) => {

    let reqBody = JSON.parse(req.body.data)
    let { apiName,apiUrl,apiDesp,apiMethod,list,id,apiId } = reqBody;
    let apiUrlList = apiUrl.split('/').map(item=>{
        if(item.indexOf(':') != -1) return '(.+)?'
        return item
    })
    apiUrl = apiUrlList.join('_')
    apiUrl+=(sliptor+apiMethod)

    let dataJson = JSON.parse(cat(path.join(__dirname,`./data/${id}.json`)))
    let data = JSON.parse(cat(path.join(__dirname,'./data/index.json')))

    let isChange = false
    if(apiId)  {
        isChange = true
        delete data.list[data.listId[apiId].apiUrl]  // 删除 index 里面的原始数据
        delete dataJson[data.listId[apiId].apiUrl]  // 删除 json 里面的数据
    }else {
        apiId = new Date().getTime()
    }
    if(data.list[apiUrl] && !apiId){
        res.end(JSON.stringify({
            code:'0001',
            msg:'地址已经存在！'
        }))
        return
    }
    data.list[apiUrl] = `./data/${id}.json`
    data.listId[apiId] = {
        target:`./data/${id}.json`,
        apiUrl
    }
    reqBody.apiLink=apiUrl
    dataJson[apiUrl] = Object.assign({},{apiId},reqBody)
    fs.writeFile(path.join(__dirname,`./data/${id}.json`), JSON.stringify(dataJson), 'utf8', (err, rst)=>{
        if (err) {
            console.error(path+' is not fond');
            process.exitCode = 1;
            return;
        }
        fs.writeFile(path.join(__dirname,'./data/index.json'), JSON.stringify(data), 'utf8', (err, rst)=>{
            if (err) {
                console.error(path+' is not fond');
                process.exitCode = 1;
                return;
            }
            res.end(JSON.stringify({
                code:'0',
                data:isChange?{save:1}:dataJson[apiUrl],
                msg:isChange?'修改接口成功！':'添加接口成功！'
            }))
        });
    });


});
app.use("/___api/list/get", (req, res) => {
    let { id,apiUrl } = req.body;
    let dataJson = JSON.parse(cat(path.join(__dirname,`./data/${id}.json`)))
    res.end(JSON.stringify({
        code:'0',
        data:dataJson[apiUrl],
        msg:""
    }))
});
app.use("/*", (req, res) => {
    let { originalUrl,method } = req
    let data = JSON.parse(cat(path.join(__dirname,'./data/index.json'))),
        dataList = data.list;
    let apiUrl = originalUrl.replace(/\//g,'_')+sliptor+method.toLowerCase()
    let dataJson = JSON.parse(cat(path.join(__dirname,data.list[apiUrl])))
    res.end(JSON.stringify({
        code:'0',
        data:Mock.mock(getMockData(dataJson[apiUrl].list)),
        msg:""
    }))
});
let port = argv.p ? argv.p : 2047
app.listen(port,'0.0.0.0',()=>{
    console.log(`start mock server listen : 127.0.0.1:${port}`)
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
                for(var i = 0;i<spec[0];i++){
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
        setMock(item,obj)
    })
    return obj
}