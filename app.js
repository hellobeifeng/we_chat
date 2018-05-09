'use strict'

// 入口文件
var Koa = require('koa')
var wechat= require('./wechat/g')
var config = require('./config')
var weixin = require('./weixin')

var app = new Koa()
app.use(wechat(config.wechat, weixin.reply))

app.listen('8888')
console.log('Listening in 8888')