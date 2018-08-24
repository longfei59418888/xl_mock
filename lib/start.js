const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const { mkdir,exec,cp,rm } = require('shelljs')
const child_process = require('child_process')

module.exports = async (argv) => {
    let mockDir = path.join(process.cwd(), 'mock');
    rm('-rf', mockDir);
    if (!fs.existsSync(mockDir)) {
        mkdir('-p', mockDir)
        cp(path.join(__dirname,'./server.js'),path.join(mockDir,'mock_server.js'))
        cp('-Rf',path.join(__dirname,'./tpl'),path.join(mockDir,'tpl'))
        cp('-Rf',path.join(__dirname,'./data'),path.join(mockDir,'data'))
    }
    let server = child_process.spawn('node', [
        path.join(mockDir,'mock_server.js'),
        '-p',
        argv.p
    ])
    server.stderr.on('data', err=>{
        let data = err.toString('utf8', 0, err.length)
        if(new RegExp(`Error: listen EADDRINUSE 0\.0\.0\.0:${argv.p}`).test(data)){
            var child = child_process.spawn('lsof',[
                '-i',
                `tcp:${argv.p}`,
            ])
            child.stdout.on('data', rst => {
                let data = rst.toString('utf8', 0, rst.length)
                if(data){
                    let reg = data.match(/node\s+(\d+)\s+/)
                    if(reg && reg[1]) {
                        exec(`kill -9 ${reg[1]}`,()=>{
                            exec('node '+path.join(mockDir,'mock_server.js')+' -p '+argv.p)
                        })
                    }
                }
            });
        }else {
            console.log(data)
        }

    });


}
