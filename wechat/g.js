'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var util = require('./util')
/**
 * 用于微信验证公众号后台功能的中间件
 * @param {Object} opts 验证公众号所需的配置对象
 */
module.exports = function(opts) {
    var wechat = new Wechat(opts) // 微信接口：获取到全局唯一的票据对象
    return function *(next) {
        console.log(this.query)
        var that = this
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
                this.body = echostr + ''
            } else {
                this.body = 'wrong'
            }
        } else if (this.method === 'POST') { // 微信将用户数据返回给程序
            // 排除非微信的请求
            if (sha !== signature) {
                this.body = 'wrong'

                return false
            }

            // 拿到post过来的异步请求的原始的xml数据
            var data = yield getRawBody(this.req, {
                length: this.length,
                limit: '1mb',
                encoding: this.charset
            })

            var content = yield util.parseXMLAsync(data) // 将xml转换成JSON对象

            var message = util.formatMessage(content.xml)

            console.log(message)

            if (message.MsgType === 'event') {
                if (message.Event === 'subscribe') {
                    var now = new Date().getTime()
                    console.log('before')
                    that.status = 200
                    that.type = 'application/xml'
                    that.body = '<xml>' + 
                    '<ToUserName><![CDATA[' + message.FromUserName + ']]></ToUserName>' + 
                    '<FromUserName><![CDATA[' + message.ToUserName +']]></FromUserName>' + 
                    '<CreateTime>'+ now +'</CreateTime>' + 
                    '<MsgType><![CDATA[text]]></MsgType>' + 
                    '<Content><![CDATA[欢迎关注]]></Content>' + 
                    '</xml>'
                    console.log('after')
                    return
                } else {
                    console.log('not subscribe')
                }
            } else {
                console.log('not event')
            }
        }
    }
}

