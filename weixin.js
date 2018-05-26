'use strict'
// 分析用户数据，根据事件类型，给出对应反馈内容的中间件
// 数据源：this.weixin 为前面处理好的用户请求数据
// 副作用：通过 this.body 将处理好的返回数据，绑定到了this上。注意，此时的this为koa当前请求的this

var path = require('path')
var config = require('./config')
var Wechat = require('./wechat/wechat')
var wechatApi = new Wechat(config.wechat)

var Movie = {}
var options = {}

var help = '亲爱的，欢迎关注科幻电影世界\n' +
   '回复 1 ~ 3，测试文字回复\n'

exports.reply = function* (next) {
  var message = this.weixin

  console.log(message)

  if (message.MsgType === 'event') {
    if (message.Event === 'subscribe') {
      this.body = help
    } else if (message.Event === 'unsubscribe') {
      console.log('无情取关')
      this.body = ''
    } else if (message.Event === 'LOCATION') {
      this.body = '您上报的位置是： ' + message.Latitude + '/' + message.Longitude + '-' + message.Precision
    } else if (message.Event === 'SCAN') {
      console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket)

      this.body = '看到你扫了一下哦'
    } else if (message.Event === 'VIEW') {
      this.body = '您点击了菜单中的链接 ： ' + message.EventKey
    } else if (message.Event === 'scancode_push') {
      console.log(message.ScanCodeInfo.ScanType)
      console.log(message.ScanCodeInfo.ScanResult)
      this.body = '您点击了菜单中 ： ' + message.EventKey
    } else if (message.Event === 'scancode_waitmsg') {
      console.log(message.ScanCodeInfo.ScanType)
      console.log(message.ScanCodeInfo.ScanResult)
      this.body = '您点击了菜单中 ： ' + message.EventKey
    } else if (message.Event === 'pic_sysphoto') {
      console.log(message.SendPicsInfo.PicList)
      console.log(message.SendPicsInfo.Count)
      this.body = '您点击了菜单中 ： ' + message.EventKey
    } else if (message.Event === 'pic_photo_or_album') {
      console.log(message.SendPicsInfo.PicList)
      console.log(message.SendPicsInfo.Count)
      this.body = '您点击了菜单中 ： ' + message.EventKey
    } else if (message.Event === 'pic_weixin') {
      console.log(message.SendPicsInfo.PicList)
      console.log(message.SendPicsInfo.Count)
      this.body = '您点击了菜单中 ： ' + message.EventKey
    } else if (message.Event === 'location_select') {
      console.log(message.SendLocationInfo.Location_X)
      console.log(message.SendLocationInfo.Location_Y)
      console.log(message.SendLocationInfo.Scale)
      console.log(message.SendLocationInfo.Label)
      console.log(message.SendLocationInfo.Poiname)
      this.body = '您点击了菜单中 ： ' + message.EventKey
    } else if (message.Event === 'CLICK') {
      var news = []

      if (message.EventKey === 'movie_hot') {
        let movies = yield Movie.findHotMovies(-1, 10)

        movies.forEach(function(movie) {
          news.push({
            title: movie.title,
            description: movie.title,
            picUrl: movie.poster,
            url: options.baseUrl + '/wechat/jump/' + movie._id
          })
        })
      } else if (message.EventKey === 'movie_cold') {
        let movies = yield Movie.findHotMovies(1, 10)

        movies.forEach(function(movie) {
          news.push({
            title: movie.title,
            description: movie.title,
            picUrl: movie.poster,
            url: options.baseUrl + '/wechat/jump/' + movie._id
          })
        })
      } else if (message.EventKey === 'movie_crime') {
        let cat = yield Movie.findMoviesByCate('犯罪')

        cat.movies.forEach(function(movie) {
          news.push({
            title: movie.title,
            description: movie.title,
            picUrl: movie.poster,
            url: options.baseUrl + '/wechat/jump/' + movie._id
          })
        })
      } else if (message.EventKey === 'movie_cartoon') {
        let cat = yield Movie.findMoviesByCate('动画')

        cat.movies.forEach(function(movie) {
          news.push({
            title: movie.title,
            description: movie.title,
            picUrl: movie.poster,
            url: options.baseUrl + '/wechat/jump/' + movie._id
          })
        })
      } else if (message.EventKey === 'help') {
        news = help
      }

      this.body = news
    }
  } else if (message.MsgType === 'voice') {
    var voiceText = message.Recognition
    var movies = yield Movie.searchByName(voiceText)

    if (!movies || movies.length === 0) {
      movies = yield Movie.searchByDouban(voiceText)
    }

    if (movies && movies.length > 0) {
      reply = []

      movies = movies.slice(0, 10)

      movies.forEach(function(movie) {
        reply.push({
          title: movie.title,
          description: movie.title,
          picUrl: movie.poster,
          url: options.baseUrl + '/wechat/jump/' + movie._id
        })
      })
    } else {
      reply = '没有查询到与 ' + voiceText + ' 匹配的电影，要不要换一个名字试试'
    }

    this.body = reply
  } else if (message.MsgType === 'text') {
    var content = message.Content
    var reply = '额，你说的 ' + message.Content + ' 太复杂了'

    if (content === '1') {
      reply = '天下第一吃大米'
    } else if (content === '2') {
      reply = '天下第二吃豆腐'
    } else if (content === '3') {
      reply = '天下第三吃仙丹'
    } else if (content === '首页') {
      reply = [{
        title: 'http://wechat.t.imooc.io/nodeport/',
        description: 'PC 上预览效果更佳',
        picUrl: 'http://szimg.mukewang.com/56ea544a00012caf05400300-156-88.jpg',
        url: 'http://wechat.t.imooc.io/nodeport/'
      }]
    } else if (content === '4') { // 图文列表
      reply = [{
        title: '咩咩改变世界',
        description: '只是个描述而已',
        picUrl: 'http://res.cloudinary.com/moveha/image/upload/v1441184110/assets/images/Mask-min.png',
        url: 'https://github.com/'
      },{
        title: 'Nodejs 开发咩咩',
        description: '爽到爆',
        picUrl: 'https://res.cloudinary.com/moveha/image/upload/v1431337192/index-img2_fvzeow.png',
        url: 'https://nodejs.org/'
      }]
    } else if (content === '5') { // 回复图片
      var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, './2.jpg'))

      reply = {
        type: 'image',
        mediaId: data.media_id
      }
      console.log(reply)
    } else if (content === '6') { // 回复视频
      var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, './6.mp4'))
      reply = {
        type: 'video',
        title: '回复视频内容',
        description: '打个篮球玩玩',
        mediaId: data.media_id
      }
    } else if (content === '7') { // 回复音频
      var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, './2.jpg'))

      reply = {
        type: 'music',
        title: '回复音乐内容',
        description: '放松一下',
        musicUrl: 'http://mpge.5nd.com/2015/2015-9-12/66325/1.mp3',
        thumbMediaId: data.media_id
      }
    } else if (content === '8') { // 上传永久素材
      var data = yield wechatApi.uploadMaterial('image', path.join(__dirname, './2.jpg'), {type: 'image'})

      reply = {
        type: 'image',
        mediaId: data.media_id
      }
    } else if (content === '9') {
      var data = yield wechatApi.uploadMaterial('video', path.join(__dirname, './6.mp4'), {type: 'video', description: '{"title": "Really a nice place", "introduction": "Never think it so easy"}'})

      reply = {
        type: 'video',
        title: '回复视频内容',
        description: '打个篮球玩玩',
        mediaId: data.media_id
      }
    } else if (content === '10') {
      // 步骤1 上传永久图片素材 TODO 这个返回内容 TODO 每次都需要先上传在使用吗？可不可以将之前上传的
      var picData = yield wechatApi.uploadMaterial('image', path.join(__dirname, './2.jpg'), {}) // 永久素材

      // 步骤2 根据素材id拼接图文素材数组
      var media = {
        articles: [{
          title: '图文1',
          thumb_media_id: picData.media_id,
          author: 'feng',
          digest: '没有摘要',
          show_cover_pic: 1, //显示封面图
          content: '没有内容',
          content_source_url: 'https://github.com' // 点击跳转连接
        }, {
          title: '图文2',
          thumb_media_id: picData.media_id,
          author: 'feng',
          digest: '没有摘要',
          show_cover_pic: 1,
          content: '没有内容',
          content_source_url: 'https://github.com'
        }]
      }

      // 步骤3 上传图文素材
      data = yield wechatApi.uploadMaterial('news', media, {})
      // 步骤4 获取图文素材
      data = yield wechatApi.fetchMaterial(data.media_id, 'news', {})

      console.log('获取到已经上传过的图文数据', data)

      var items = data.news_item
      var news = [] // 用于回复图文信息

      items.forEach(function(item) {
        news.push({
          title: item.title,
          decription: item.digest,
          picUrl: picData.url,
          url: item.url
        })
      })

      reply = news
    } else if (content === '11') {
      var counts = yield wechatApi.countMaterial()

      console.log(JSON.stringify(counts))

      var results = yield [
        wechatApi.batchMaterial({
          type: 'image',
          offset: 0,
          count: 10
        }),
        wechatApi.batchMaterial({
          type: 'video',
          offset: 0,
          count: 10
        }),
        wechatApi.batchMaterial({
          type: 'voice',
          offset: 0,
          count: 10
        }),
        wechatApi.batchMaterial({
          type: 'news',
          offset: 0,
          count: 10
        })
      ]

      reply = JSON.stringify(results)
    }
    else if (content === '12') {
      // var group = yield wechatApi.createGroup('test1')
      // var group_1 = yield wechatApi.createGroup('test2')
      // console.log('新分组 test1 test2')
      // console.log(group)

      // var groups = yield wechatApi.fetchGroups()
      // console.log('加了 test1 test2 后的分组列表')
      // console.log(groups)

      // var group2 = yield wechatApi.checkGroup(message.FromUserName)
      // console.log('查看自己所在的分组')
      // console.log(group2)

      // var result = yield wechatApi.moveGroup(message.FromUserName, 101)
      // console.log('将自己移动到  101')
      // console.log(result)

      // var groups2 = yield wechatApi.fetchGroups()
      // console.log('移动后的分组列表')
      // console.log(groups2)

      // var result2 = yield wechatApi.moveGroup([message.FromUserName], 100)
      // console.log('批量移动到  100')
      // console.log(result2)

      // var groups3 = yield wechatApi.fetchGroups()
      // console.log('批量移动后的分组列表')
      // console.log(groups3)

      // var result3 = yield wechatApi.updateGroup(101, '12306')
      // console.log('101 test1 改名 12306')
      // console.log(result3)

      // var groups4 = yield wechatApi.fetchGroups()
      // console.log('改名后的分组列表')
      // console.log(groups4)

      // var result4 = yield wechatApi.deleteGroup(102)
      // console.log('删除 102  分组')
      // console.log(result4)


      var groups5 = yield wechatApi.fetchGroups()
      console.log('删除 102 后分组列表')
      console.log(groups5)

      reply = 'done'
      // reply = JSON.stringify(groups3)
    } else if (content === '13') {
      var user = yield wechatApi.fetchUsers(message.FromUserName)
      console.log('单独获取')
      console.log(user)

      // 批量获取
      var openIds = [{
          openid: message.FromUserName,
          lang: 'en'
      }]
      var users = yield wechatApi.fetchUsers(openIds)
      console.log('批量获取')
      console.log(users)
      
      reply = JSON.stringify(user)

    } else if (content === '14') {
      var userlist = yield wechatApi.listUsers()

      console.log(userlist)

      reply = userlist.total
    } else if (content === '15') {
      var mpnews = {
        media_id: 'tWieFbfwczCt3AbOGNzmVzaEHNVZP2--gHMHZ01IAEo'
      }
      var text = {
        'content': 'Hello Wechat'
      }

      var msgData = yield wechatApi.sendByGroup('text', text, 119)

      console.log(msgData)
      reply = 'Yeah!'
    } else if (content === '16') {
      var mpnews = {
        media_id: 'tWieFbfwczCt3AbOGNzmVzaEHNVZP2--gHMHZ01IAEo'
      }
      // var text = {
      //   'content': 'Hello Wechat'
      // }

      var msgData = yield wechatApi.previewMass('mpnews', mpnews, 'okH-duBePdGVlZ3PyqJsVkBeJspw')

      console.log(msgData)
      reply = 'Yeah!'
    } else if (content === '17') {
      var msgData = yield wechatApi.checkMass('400958630')

      console.log(msgData)
      reply = 'Yeah hah!'
    } else if (content === '18') {
      // var tempQr = {
      //   expire_seconds: 400000,
      //   action_name: 'QR_SCENE',
      //   action_info: {
      //     scene: {
      //       scene_id: 123
      //     }
      //   }
      // }

      // var permQr = {
      //   action_name: 'QR_LIMIT_SCENE',
      //   action_info: {
      //     scene: {
      //       scene_id: 123
      //     }
      //   }
      // }

      // var permStrQr = {
      //   action_name: 'QR_LIMIT_STR_SCENE',
      //   action_info: {
      //     scene: {
      //       scene_str: 'abc'
      //     }
      //   }
      // }

      //var qr1 = yield wechatApi.createQrcode(tempQr)
      //var qr2 = yield wechatApi.createQrcode(permQr)
      //var qr3 = yield wechatApi.createQrcode(permStrQr)


      reply = 'Yeah hah!'
    } else if (content === '19') {
      var longUrl = 'http://www.imooc.com/'

      var shortData = yield wechatApi.createShorturl(null, longUrl)

      reply = shortData.short_url
    } else if (content === '20') {
      var semanticData = {
        query: '寻龙诀',
        city: '杭州',
        category: 'movie',
        uid: message.FromUserName
      }

      var _semanticData = yield wechatApi.semantic(semanticData)


      reply = JSON.stringify(_semanticData)
    } else {
      var movies = yield Movie.searchByName(content)

      if (!movies || movies.length === 0) {
        movies = yield Movie.searchByDouban(content)
      }

      if (movies && movies.length > 0) {
        reply = []

        movies = movies.slice(0, 10)

        movies.forEach(function(movie) {
          reply.push({
            title: movie.title,
            description: movie.title,
            picUrl: movie.poster,
            url: options.baseUrl + '/wechat/jump/' + movie._id
          })
        })
      } else {
        reply = '没有查询到与 ' + content + ' 匹配的电影，要不要换一个名字试试'
      }
    }

    this.body = reply
  }

  yield next
}