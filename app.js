'use strict'

var Koa = require('koa')
var path = require('path')
var util = require('./libs/util')
var wechat= require('./wechat/g')
var wechat_file = path.join(__dirname, './wechat/config/wechat.txt') // 存放微信票据信息的文件

var config = {
    wechat: {
        appID: 'wx10b39772c635be3c',
        appSecret: 'ae405c48477703f6f59c62f02a000b7b',
        token: 'hellobeifeng',
        getAccessToken: function() {
            return util.readFileAsync(wechat_file)
        },
        saveAccessToken: function(data) {
            data = JSON.stringify(data)
            return util.writeFileAsync(wechat_file, data)
        }
    }
}

var app = new Koa()
app.use(wechat(config.wechat)) // 步骤1：首先进行微信验证后台程序

app.listen('8888')
console.log('Listening in 8888')