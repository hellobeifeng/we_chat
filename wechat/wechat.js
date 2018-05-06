'use strict'

var Promise = require('bluebird')
var request = Promise.promisify(require('request'))

var prefix = 'https://api.weixin.qq.com/cgi-bin/'
var api = {
    accessToken: prefix + 'token?grant_type=client_credential'
}

function Wechat(opts) {
    var that = this;
    this.appID = opts.appID
    this.appSecret = opts.appSecret
    this.getAccessToken = opts.getAccessToken
    this.saveAccessToken = opts.saveAccessToken

    this.getAccessToken()   // 从文件中读取票据信息
        .then(function(data) {
   
            try {
                data = JSON.parse(data) // 解析票据信息字符串为JSON对象
            } catch(e) {
                return that.updateAccessToken() // 如果出错（比如没有数据），则更新票据信息
            }

            if (that.isValidAccessToken(data)) { // 解析了票据对象，判断数据是否有效（比如票据没有失效）
                return Promise.resolve(data) // 判断完毕，向下传递
            } else {
                return that.updateAccessToken() // 票据失效，则重新更新
            }

        })
        .then(function(data) {
            that.access_token = data.access_token
            that.expires_in = data.expires_in

            that.saveAccessToken(data) // 存储票据信息
        })
}

Wechat.prototype.isValidAccessToken = function(data) {
    if (!data || !data.access_token || !data.expires_in) {
        return false
    }

    var access_token = data.access_token
    var expires_in = data.expires_in
    var now = (new Date().getTime())

    if (now < expires_in) {
        return true
    } else {
        return false
    }
} 

Wechat.prototype.updateAccessToken = function() {
    var appID = this.appID
    var appSecret = this.appSecret
    var url = api.accessToken + '&appid=' + appID + '&secret=' + appSecret

    return new Promise(function(resolve, reject) {
        request({
            url: url,
            json: true
        })
        .then(function(response) {
            var data = response[1]
            var now = (new Date().getTime())
            // 设置票据有效期（注意缩短了20s，为了排除网络延迟，程序延迟等影响因素）
            var expires_in = now + (data.expires_in - 20) * 1000
    
            data.expires_in = expires_in
            resolve(data)
        })
    })

}

module.exports = Wechat