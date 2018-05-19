'use strict'

var Promise = require('bluebird')
var request = Promise.promisify(require('request')) // 将原本的request模块到处对象Prmoise化
var wechat_util = require('./util')
var path = require('path')
var util = require('../libs/util')
var access_token_file = path.join(__dirname, './config/access_token.txt') // 使用txt的方式，存放全局唯一微信票据信息
var fs = require('fs')
var _ = require('lodash')

// 微信公众号接口前缀
var prefix = 'https://api.weixin.qq.com/cgi-bin/'
// 微信公众号接口后缀
var api = {
    accessToken: prefix + 'token?grant_type=client_credential', // 获取票据接口后缀  https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140183
    temporary: {
        upload: prefix + 'media/upload?',
        fetch: prefix + 'media/get?'
    },
    permanent: {
        upload: prefix + 'material/add_material?',
        uploadNews: prefix + 'material/add_news?',
        uploadNewsPic: prefix + 'media/uploadimg?',
        fetch: prefix + 'material/get_material?',
        del: prefix + 'material/del_material?',
        update: prefix + 'material/update_news?',
        count: prefix + 'material/get_materialcount?',
        batch: prefix + 'material/batchget_material?'
    }
}

// 处理票据的对象
function Wechat(opts) {
    var that = this;
    this.appID = opts.appID
    this.appSecret = opts.appSecret

    this.fetchAccessToken()
}

// 封装获取票据数据
Wechat.prototype.fetchAccessToken = function() {
    var that = this
    if (this.access_token && this.expires_in) {
        if (this.isValidAccessToken(this)) {
            return Promise.resolve(this)
        }
    }

    this.getAccessToken()   // 从文件中读取票据信息
        .then(function(data) {
   
            try {
                data = JSON.parse(data) // 解析文件中获取的票据信息字符串为JSON对象 TODO　空内容会不会进入catch?
            } catch(e) {
                return that.updateAccessToken() // 如果出错（比如没有票据数据），则更新票据信息（请求票据接口）
            }

            if (that.isValidAccessToken(data)) { // 解析了票据对象，判断数据是否有效（比如票据没有失效）
                return Promise.resolve(data) // 判断完毕，向下传递
            } else {
                return that.updateAccessToken() // 票据失效，则重新更新 TODO update后并没有验证票据信息的有效性
            }

        })
        .then(function(data) {
            // 在this上挂在票据信息，用来在上下文中判断是否存在票据
            that.access_token = data.access_token
            that.expires_in = data.expires_in

            that.saveAccessToken(data) // 存储票据信息
            
            return Promise.resolve(data)
        })
}

// 判断票据是否失效
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

// 更新票据信息
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
            // 设置票据失效时间（注意缩短了20s，为了排除网络延迟，程序延迟等影响因素）
            data.expires_in = now + (data.expires_in - 20) * 1000
            resolve(data)
        })
    })
}

// （从文件）获取票据信息
Wechat.prototype.getAccessToken = function() {
    return util.readFileAsync(access_token_file)
}

// 将票据信息保存到文件中
Wechat.prototype.saveAccessToken = function(data) {
    data = JSON.stringify(data)
    return util.writeFileAsync(access_token_file, data)
}


/**
 * 上传素材文件（临时素材/永久素材 ）
 * @param {String} type 素材类型
 * @param {String/String} material type是news（图文），则表示material为数组；否则material为字符串，代表素材在服务器中的路径
 * @param {*} permanent 是否为永久素材
 */
Wechat.prototype.uploadMaterial = function(type, material, permanent) {
    var that = this
    var form = {}
    var uploadUrl = api.temporary.upload

    // 如果是永久素材，则替换上传的Url
    if (permanent) {
        uploadUrl = api.permanent.upload

        _.extend(form, permanent) // 通过form继承performant，让form 兼容所有上传类型
    }

    // 图文消息中要上传的图片
    if (type === 'pic') {
        uploadUrl = api.permanent.uploadNewsPic
    }
    
    // 图文
    if (type === 'news') {
        uploadUrl = api.permanent.uploadNews
        form = material
    } else {
        form.media = fs.createReadStream(material) // 根据素材创建可写流
    }
    
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
            var url = uploadUrl + 'access_token=' + data.access_token

            if (!permanent) {
                url += '&type=' + type
            } else {
                form.access_token = data.access_token
            }

            var options = {
                method: 'POST',
                url: url,
                json: true
            }

            if (type === 'news') {
                options.body = form
            } else {
                options.formData = form
            }

            request(options).then(function(response) {
                var _data = response[1]
      
                if (_data) {
                  resolve(_data)
                }
                else {
                  throw new Error('Delete material fails')
                }
              })
            .catch(function(err) {
                reject(err)
            })
        })
    })
}

// 提供下载资源
Wechat.prototype.fetchMaterial = function(mediaId, type, permanent) {
    var that = this
    var fetchUrl = api.temporary.fetch
  
    if (permanent) {
      fetchUrl = api.permanent.fetch
    }
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
            var url = fetchUrl + 'access_token=' + data.access_token
            var form = {}
            var options = {method: 'POST', url: url, json: true}
    
            if (permanent) {
                form.media_id = mediaId
                form.access_token = data.access_token
                options.body = form
            } else {
                if (type === 'video') {
                url = url.replace('https://', 'http://')
                }
    
                url += '&media_id=' + mediaId
            }
    
            if (type === 'news' || type === 'video') {
                request(options).then(function(response) {
                    var _data = response[1]
        
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('fetch material fails')
                    }
                })
                .catch(function(err) {
                    reject(err)
                })
            } else {
                resolve(url)
            }
        })
    })
}

// 删除永久资源
Wechat.prototype.deleteMaterial = function(mediaId) {
    var that = this
    var form = {
      media_id: mediaId
    }
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
            var url = api.permanent.del + 'access_token=' + data.access_token + '&media_id=' + mediaId
    
            request({method: 'POST', url: url, body: form, json: true})
                .then(function(response) {
                    var _data = response[1]
        
                    if (_data) {
                        resolve(_data)
                    } else {
                        throw new Error('Delete material fails')
                    }
                })
                .catch(function(err) {
                    reject(err)
                })
        })
    })
}
  
// 更新永久素材
Wechat.prototype.updateMaterial = function(mediaId, news) {
    var that = this
    var form = {
      media_id: mediaId
    }
  
    _.extend(form, news)
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
        var url = api.permanent.update + 'access_token=' + data.access_token + '&media_id=' + mediaId

        request({method: 'POST', url: url, body: form, json: true})
          .then(function(response) {
            var _data = response[1]

            if (_data) {
                resolve(_data)
            } else {
                throw new Error('Delete material fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}

// 获取永久素材总数
Wechat.prototype.countMaterial = function() {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.permanent.count + 'access_token=' + data.access_token
  
          request({method: 'GET', url: url, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Count material fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 获取永久素材列表
Wechat.prototype.batchMaterial = function(options) {
    var that = this
  
    options.type = options.type || 'image'
    options.offset = options.offset || 0
    options.count = options.count || 1
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.permanent.batch + 'access_token=' + data.access_token
  
          request({method: 'POST', url: url, body: options, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('batch material fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}





//　处理用户 返回状态和数据 （注意此函数的 context已经该改变） TODO看看下次能不能把这个该死的函数优化掉
Wechat.prototype.replay = function() {

    var server_send_message = this.body   // 要反馈给用户的内容，比如用户订阅公众号， 服务返回的 “欢迎订阅这个公众号”
    var user_send_obj = this.weixin // 接受到的用户传送来的数据对象

    var xml = wechat_util.tpl(server_send_message, user_send_obj) // 拼接被动回复xml

    this.status = 200
    this.type = 'application/xml'
    this.body = xml
}
 
module.exports = Wechat