'use strict'

var sha1 = require('sha1')
var getRawBody = require('raw-body')
var Wechat = require('./wechat')
var wechat_util = require('./util')
/**
 * 用于微信验证公众号后台功能的中间件
 * @param {Object} opts 微信的全局配置对象（包括验证后台服务的appkey 和 封装的获取/存储票据的方法）
 * @param {Object} handler 回调函数
 */
module.exports = function(opts, handler) {
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
        var a = 1;
        // GET 请求类型
        if(this.method === 'GET') {
            if (sha === signature) {     // 微信验证程序的请求
                this.body = echostr + '' // 验证成功，按照约定返回echostr
                return false
            } else {
                this.body = 'wrong'      // 验证失败，返回 wrong TODO 不用返回 false 吗？为什么下面的要返回 false? 什么时候需要返回 false
                // return false          // 后面没有逻辑，所以可加可不加
            }
        } else if (this.method === 'POST') { // POST 请求类型
            if (sha !== signature) {
                this.body = 'wrong'      //  不是来自微信的请求，返回 wrong, 退出中间件，什么也不做
                return false             //  结束本次请求，不继续走后面的逻辑
            }

            // 拿到微信 post 过来的包裹用户请求信息的原始的xml数据 
            var data = yield getRawBody(this.req, {
                length: this.length,
                limit: '1mb',
                encoding: this.charset
            })

            var content = yield wechat_util.parseXMLAsync(data) // 将xml转换成JSON对象
            // console.log('xml to js: ',  content)

            // {
            //     xml: {
            //       ToUserName: ['gh_e313e6745768'],
            //       FromUserName: ['oF92LxHsR-ml359b5yPGkHS1piIE'],
            //       CreateTime: ['1526111035'],
            //       MsgType: ['text'],
            //       Content: ['1'],
            //       MsgId: ['6554596986105344851']
            //     }
            // }

            this.weixin = wechat_util.formatMessage(content.xml) // 将上一步生成的JSON对象进行格式化,形成可以使用的消息对象
            // console.log('js after format: ',  message)

            // {
            //     ToUserName: 'gh_e313e6745768',
            //     FromUserName: 'oF92LxHsR-ml359b5yPGkHS1piIE',
            //     CreateTime: '1526111584',
            //     MsgType: 'text',
            //     Content: '1',
            //     MsgId: '6554599344042390444'
            // }

            yield handler.call(this, next) // 根据用户内容，生成对应的被动回复消息
            wechat.replay.call(this) // 根据上一步生成的回复消息体拼接回复消息结构，然后返给用户
        }
    }
}

