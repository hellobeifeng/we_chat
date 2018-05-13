'use strict'

// 微信业务模块的工具方法
var xml2js = require('xml2js')
var Promise = require('bluebird')
var tpl = require('./tpl')

/**
 * 将XML格式的数据转换成json格式，返回Promise TODO 考虑放到全局 util 里
 * @param {String} xml 要解析的XML数据
 * @returns {??} TODO 返回啥类型的数据
 */
exports.parseXMLAsync = function(xml) {
    return new Promise(function(resolve, reject) {
        xml2js.parseString(xml, {trim: true}, function(err, content) {
            if (err) reject(err)
            resolve(content)
        })
    })
}

/**
 *  实现对入参对象的格式化（深拷贝，过滤无效数据，有待优化）
    入参例子
    { 
        ToUserName: [ 'gh_e313e6745768' ],
        FromUserName: [ 'oF92LxHsR-ml359b5yPGkHS1piIE' ],
        CreateTime: [ '1525594475' ],
        MsgType: [ 'event' ],
        Event: [ 'subscribe' ],
        EventKey: [ '' ] 
    }
 * @param {Obejct} result 格式化好的对象 TODO 弄个例子出来 然后考虑放到全局util里
 */
function formatMessage(result) {
    var message = {}

    if (typeof result === 'object') {
        var keys = Object.keys(result)

        for (var i = 0; i< keys.length; i++) {
            var item = result[keys[i]]
            var key = keys[i]

            if (!(item instanceof Array) || item.length === 0) {
                continue
            }

            if (item.length === 1) {
                var val = item[0]

                if(typeof val === 'object') {
                    message[key] = formatMessage(val)
                } else {
                    message[key] = (val || '').trim()
                }
            } else {            // 说明是个数组
                message[key] = []

                for(var j = 0, k = item.length; j < k; j++) {
                    message[key].push(formatMessage(item[j]))
                }
            }

        }
    }

    return message
}

exports.formatMessage = formatMessage


/**
 * 根据前面逻辑返回要回复用户的结果和用户传过来的对象，调用模板内容，拼接回复用户的xml结构
 * @param {String/Array} content 要给用户回复的内容
 * @param {Object} message 用户发过来的请求对象
 */
exports.tpl = function(content, message) {
    var info = {}
    var fromUserName = message.FromUserName // 用户openid
    var toUserName = message.ToUserName     // 公众号id

    var type = 'text'                       // 默认返回类型是 text 类型
    if (Array.isArray(content)) {           // 如果 content 为数组，则告诉微信，当前返回内容类型为图文消息
      type = 'news'
    }
  
    if (!content) {
      content = 'Empty news'
    }
  
    type = content.type || type             // TODO 关注一下这个content 支持情况
    info.content = content
    info.createTime = new Date().getTime()
    info.msgType = type
    info.toUserName = fromUserName
    info.fromUserName = toUserName
  
    // 根据参数拼接 微信要求的 返回给用户的 xml模板
    return tpl.compiled(info)
  }

