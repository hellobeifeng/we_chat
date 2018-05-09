'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')
/**
 * 用于微信验证公众号后台功能的中间件
 * @param {Object} opts 验证公众号所需的配置对象
 * @param {Object} handler 回调函数
 */
module.exports = function(opts, handler) {
    var wechat = new Wechat(opts) // 微信接口：获取到全局唯一的票据对象（还注册了一个能够处理自动回复的接口）
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
        
        // GET 请求类型：微信验证程序的请求
        if(this.method === 'GET') {
            if (sha === signature) {
                this.body = echostr + '' // 验证成功，返回echostr
            } else {
                this.body = 'wrong'      // 验证失败，返回 wrong
            }
        } else if (this.method === 'POST') { // POST 请求类型：微信将用户数据返回给程序
            // 排除非微信的请求
            if (sha !== signature) {
                this.body = 'wrong'     // 验证失败，返回 wrong, 推出中间件，什么也不做
                return false
            }

            // 拿到post过来的异步请求的原始的xml数据
            var data = yield getRawBody(this.req, {
                length: this.length,
                limit: '1mb',
                encoding: this.charset
            })

            var content = yield util.parseXMLAsync(data) // 将xml转换成JSON对象
            var message = util.formatMessage(content.xml) // 将上一步生成的JSON对象进行格式化

            this.weixin = message // 将解析好的数据挂在到 this 上
            console.log('## before weinxin hander')
            yield handler.call(this, next)
            console.log('## after weinxin hander')
            wechat.replay.call(this) // 自动回复
        }
    }
}

