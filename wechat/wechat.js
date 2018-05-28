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
    },
    group: {
        create: prefix + 'groups/create?',
        fetch: prefix + 'groups/get?',
        check: prefix + 'groups/getid?',
        update: prefix + 'groups/update?',
        move: prefix + 'groups/members/update?',
        batchupdate: prefix + 'groups/members/batchupdate?',
        del: prefix + 'groups/delete?'
    },
    user: {
        remark: prefix + 'user/info/updateremark?',
        fetch: prefix + 'user/info?',
        batchFetch: prefix + 'user/info/batchget?',
        list: prefix + 'user/get?'
    },
    mass: {
        group: prefix + 'message/mass/sendall?',
        openId: prefix + 'message/mass/send?',
        del: prefix + 'message/mass/delete?',
        preview: prefix + 'message/mass/preview?',
        check: prefix + 'message/mass/get?'
    },
    menu: {
      create: prefix + 'menu/create?',
      get: prefix + 'menu/get?',
      del: prefix + 'menu/delete?',
      current: prefix + 'get_current_selfmenu_info?'
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
    return this.getAccessToken()   // 从文件中读取票据信息
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
            } else {
              throw new Error('batch material fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}

// 创建分组
Wechat.prototype.createGroup = function(name) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.group.create + 'access_token=' + data.access_token
          var form = {
            group: {
              name: name
            }
          }
  
          request({method: 'POST', url: url, body: form, json: true})
          .then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            } else {
              throw new Error('create group material fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 获取分组
Wechat.prototype.fetchGroups = function(name) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.group.fetch + 'access_token=' + data.access_token
  
          request({url: url, json: true})
          .then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Fetch group fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 查看用户属于哪个分组
Wechat.prototype.checkGroup = function(openId) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.group.check + 'access_token=' + data.access_token
          var form = {
            openid: openId
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Check group fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 更新分组名字
Wechat.prototype.updateGroup = function(id, name) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.group.update + 'access_token=' + data.access_token
          var form = {
            group: {
              id: id,
              name: name
            }
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Update group fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 将用户移动到指定分组
Wechat.prototype.moveGroup = function(openIds, to) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url
          var form = {
            to_groupid: to
          }
  
          if (_.isArray(openIds)) {
            url = api.group.batchupdate + 'access_token=' + data.access_token
            form.openid_list = openIds
          }
          else {
            url = api.group.move + 'access_token=' + data.access_token
            form.openid = openIds
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Move group fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 删除分组
Wechat.prototype.deleteGroup = function(id) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.group.del + 'access_token=' + data.access_token
          var form = {
            group: {
              id: id
            }
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Delete group fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}

// 设置用户备注名
Wechat.prototype.remarkUser = function(openId, remark) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.user.remark + 'access_token=' + data.access_token
          var form = {
            openid: openId,
            remark: remark
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Remark user fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 获取关注了关注了公众号的用户列表 
// openIds为数组代表支持批量
Wechat.prototype.fetchUsers = function(openIds, lang) {
    var that = this
  
    lang = lang || 'zh_CN'
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var options = {
            json: true
          }
  
          if (_.isArray(openIds)) {
            options.url = api.user.batchFetch + 'access_token=' + data.access_token
            options.body = {
              user_list: openIds
            }
            options.method = 'POST'
          } else {
            options.url = api.user.fetch + 'access_token=' + data.access_token + '&openid=' + openIds + '&lang=' + lang
          }
  
          request(options).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Fetch user fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  

Wechat.prototype.listUsers = function(openId) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.user.list + 'access_token=' + data.access_token
  
          if (openId) {
            url += '&next_openid=' + openId
          }
  
          request({url: url, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            } else {
              throw new Error('List user fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}

// 分组群发， 支持群发多种消息类型（注意，图片图文等资源需要先上传再使用，此处和上面的素材不一样）
// type 消息类型
// message 该消息类型对应的信息，比如 text -> content:'xx'
// groupId 分组id，如果不传，代表群发
// https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1481187827_i0l21
Wechat.prototype.sendByGroup = function(type, message, groupId) {
    var that = this
    var msg = {
      filter: {},
      msgtype: type
    }
  
    msg[type] = message
  
    if (!groupId) {
      msg.filter.is_to_all = true
    } else {
      msg.filter = {
        is_to_all: false,
        group_id: groupId
      }
    }
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.mass.group + 'access_token=' + data.access_token
  
          request({method: 'POST', url: url, body: msg, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            } else {
              throw new Error('Send to group fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 按照 openid 群发消息 （服务号才有这个功能）
Wechat.prototype.sendByOpenId = function(type, message, openIds) {
    var that = this
    var msg = {
      msgtype: type,
      touser: openIds
    }
  
    msg[type] = message
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.mass.openId + 'access_token=' + data.access_token
  
          request({method: 'POST', url: url, body: msg, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Send By Openid fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 删除群发 （半小时之内的）
Wechat.prototype.deleteMass = function(msgId) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.mass.del + 'access_token=' + data.access_token
          var form = {
            msg_id: msgId
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            } else {
              throw new Error('Delete mass fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 预览接口  
Wechat.prototype.previewMass = function(type, message, openId) {
    var that = this
    var msg = {
      msgtype: type,
      touser: openId
    }
  
    msg[type] = message
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.mass.preview + 'access_token=' + data.access_token
  
          request({method: 'POST', url: url, body: msg, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            } else {
              throw new Error('Preview mass fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}
  
// 检查群发消息是否成功
Wechat.prototype.checkMass = function(msgId) {
    var that = this
  
    return new Promise(function(resolve, reject) {
      that
        .fetchAccessToken()
        .then(function(data) {
          var url = api.mass.check + 'access_token=' + data.access_token
          var form = {
            msg_id: msgId
          }
  
          request({method: 'POST', url: url, body: form, json: true}).then(function(response) {
            var _data = response[1]
  
            if (_data) {
              resolve(_data)
            }
            else {
              throw new Error('Check mass fails')
            }
          })
          .catch(function(err) {
            reject(err)
          })
        })
    })
}

// 创建自定义菜单
Wechat.prototype.createMenu = function(menu) {
  var that = this

  return new Promise(function(resolve, reject) {
    that
      .fetchAccessToken()
      .then(function(data) {
        var url = api.menu.create + 'access_token=' + data.access_token

        request({method: 'POST', url: url, body: menu, json: true}).then(function(response) {
          var _data = response[1]

          if (_data) {
            resolve(_data)
          } else {
            throw new Error('Create menu fails')
          }
        })
        .catch(function(err) {
          reject(err)
        })
      })
  })
}

// 自定义菜单查询
Wechat.prototype.getMenu = function(menu) {
  var that = this

  return new Promise(function(resolve, reject) {
    that
      .fetchAccessToken()
      .then(function(data) {
        var url = api.menu.get + 'access_token=' + data.access_token

        request({url: url, json: true}).then(function(response) {
          var _data = response[1]

          if (_data) {
            resolve(_data)
          } else {
            throw new Error('Get menu fails')
          }
        })
        .catch(function(err) {
          reject(err)
        })
      })
  })
}

// 删除自定义菜单
Wechat.prototype.deleteMenu = function() {
  var that = this

  return new Promise(function(resolve, reject) {
    that
      .fetchAccessToken()
      .then(function(data) {
        var url = api.menu.del + 'access_token=' + data.access_token

        request({url: url, json: true}).then(function(response) {
          var _data = response[1]

          if (_data) {
            resolve(_data)
          } else {
            throw new Error('Delete menu fails')
          }
        })
        .catch(function(err) {
          reject(err)
        })
      })
  })
}

// 获取自定义菜单配置
Wechat.prototype.getCurrentMenu = function() {
  var that = this

  return new Promise(function(resolve, reject) {
    that
      .fetchAccessToken()
      .then(function(data) {
        var url = api.menu.current + 'access_token=' + data.access_token

        request({url: url, json: true}).then(function(response) {
          var _data = response[1]

          if (_data) {
            resolve(_data)
          } else {
            throw new Error('Get current menu fails')
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
    console.log(xml)
    this.status = 200
    this.type = 'application/xml'
    this.body = xml
}
 
module.exports = Wechat