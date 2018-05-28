'use strict'

// 入口文件
var Koa = require('koa') // TODO 替换成 koa2
var g = require('./wechat/g') // 用于微信验证公众号后台功能的中间件
var config = require('./config') // 全局微信配置对象
var weixin = require('./wx/reply') // 

var app = new Koa()
app.use(g(config.wechat, weixin.reply))

app.listen('8888')
console.log('Listening in 8888')