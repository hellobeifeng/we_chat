// 全局配置文件 
// 用于存储公众号的 appID appSecret token
// 用于存储公众号的 票据相关的全局方法

var path = require('path')
var util = require('./libs/util')

var wechat_file = path.join(__dirname, './wechat/config/wechat.txt') // 使用txt的方式，存放全局唯一微信票据信息

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

module.exports = config