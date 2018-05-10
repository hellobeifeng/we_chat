'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')
/**
 * 用于微信验证公众号后台功能的中间件
 * @param {Object} opts 微信的全局配置对象（包括验证后台服务的appkey 和 封装的获取/存储票据的方法）
 * @param {Object} handler 回调函数
 */
module.exports = function(opts, handler) {
    // TODO 这行代码目前来说是不是可以注释掉？
    var wechat = new Wechat(opts) // 微信接口：完成票据获取（还注册了一个能够处理自动回复的接口）
    return function *(next) {
        var that = this
        
        // ****  首先验证微信服务器请求
        var token = opts.token
        var signature = this.query.signature
        var nonce = this.query.nonce
        var timestamp = this.query.timestamp
        var echostr = this.query.echostr
    
        var str = [token, timestamp, nonce].sort().join('')
        var sha = sha1(str)
        
        // GET 请求类型
        if(this.method === 'GET') {
            if (sha === signature) {     // 微信验证程序的请求
                this.body = echostr + '' // 验证成功，按照约定返回echostr
            } else {
                this.body = 'wrong'      // 验证失败，返回 wrong TODO 不用返回 false 吗？为什么下面的要返回 false? 什么时候需要返回 false
            }
        } else if (this.method === 'POST') { // POST 请求类型
            if (sha !== signature) {
                this.body = 'wrong'      //  不是来自微信的请求，返回 wrong, 退出中间件，什么也不做
                return false
            }

            // 拿到微信 post 过来的包裹用户请求信息的原始的xml数据 TODO 看看这个插件干嘛用的 this.charset看看 koa api
            var data = yield getRawBody(this.req, {
                length: this.length,
                limit: '1mb',
                encoding: this.charset
            })

            var content = yield util.parseXMLAsync(data) // 将xml转换成JSON对象
            var message = util.formatMessage(content.xml) // 将上一步生成的JSON对象进行格式化 TODO 这里放一个结果的例子
            this.weixin = message // 将解析好的数据挂在到 this 上

            yield handler.call(this, next) // 被动回复 将xml解析好后，执行回调函数 （根据用户内容，生成对应的被动回复消息）
            wechat.replay.call(this) // 上一步在this上绑定了要返回给用户的数据content ，是不是已经返回给用户了，那这一步难道是又发了一个请求？
        }
    }
}

