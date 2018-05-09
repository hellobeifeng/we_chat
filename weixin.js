'use strict'

exports.reply = function* (next) {
    var message = this.weixin

    if (message.MsgType === 'event') {
        if (message.Event === 'subscribe') {
          this.body = '欢迎订阅这个公众号\r\n' 
        } else if (message.Event === 'unsubscribe') {
          console.log('无情取关')
          this.body = ''
        } else if (message.Event === 'LOCATION') {
          this.body = '您上报的位置是： ' + message.Latitude + '/' + message.Longitude + '-' + message.Precision
        }
        else if (message.Event === 'SCAN') {
          console.log('关注后扫二维码' + message.EventKey + ' ' + message.Ticket)
    
          this.body = '看到你扫了一下哦'
        }
        else if (message.Event === 'VIEW') {
          this.body = '您点击了菜单中的链接 ： ' + message.EventKey
        }
        else if (message.Event === 'scancode_push') {
          console.log(message.ScanCodeInfo.ScanType)
          console.log(message.ScanCodeInfo.ScanResult)
          this.body = '您点击了菜单中 ： ' + message.EventKey
        }
        else if (message.Event === 'scancode_waitmsg') {
          console.log(message.ScanCodeInfo.ScanType)
          console.log(message.ScanCodeInfo.ScanResult)
          this.body = '您点击了菜单中 ： ' + message.EventKey
        }
        else if (message.Event === 'pic_sysphoto') {
          console.log(message.SendPicsInfo.PicList)
          console.log(message.SendPicsInfo.Count)
          this.body = '您点击了菜单中 ： ' + message.EventKey
        }
        else if (message.Event === 'pic_photo_or_album') {
          console.log(message.SendPicsInfo.PicList)
          console.log(message.SendPicsInfo.Count)
          this.body = '您点击了菜单中 ： ' + message.EventKey
        }
        else if (message.Event === 'pic_weixin') {
          console.log(message.SendPicsInfo.PicList)
          console.log(message.SendPicsInfo.Count)
          this.body = '您点击了菜单中 ： ' + message.EventKey
        }
        else if (message.Event === 'location_select') {
          console.log(message.SendLocationInfo.Location_X)
          console.log(message.SendLocationInfo.Location_Y)
          console.log(message.SendLocationInfo.Scale)
          console.log(message.SendLocationInfo.Label)
          console.log(message.SendLocationInfo.Poiname)
          this.body = '您点击了菜单中 ： ' + message.EventKey
        }
        else if (message.Event === 'CLICK') {
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
          }
          else if (message.EventKey === 'movie_cold') {
            let movies = yield Movie.findHotMovies(1, 10)
    
            movies.forEach(function(movie) {
              news.push({
                title: movie.title,
                description: movie.title,
                picUrl: movie.poster,
                url: options.baseUrl + '/wechat/jump/' + movie._id
              })
            })
          }
          else if (message.EventKey === 'movie_crime') {
            let cat = yield Movie.findMoviesByCate('犯罪')
    
            cat.movies.forEach(function(movie) {
              news.push({
                title: movie.title,
                description: movie.title,
                picUrl: movie.poster,
                url: options.baseUrl + '/wechat/jump/' + movie._id
              })
            })
          }
          else if (message.EventKey === 'movie_cartoon') {
            let cat = yield Movie.findMoviesByCate('动画')
    
            cat.movies.forEach(function(movie) {
              news.push({
                title: movie.title,
                description: movie.title,
                picUrl: movie.poster,
                url: options.baseUrl + '/wechat/jump/' + movie._id
              })
            })
          }
          else if (message.EventKey === 'help') {
            news = help
          }
    
          this.body = news
        }
    } else if (message.MsgType === 'text') {
        var content = message.Content
        var reply = '额，你说的 ' + message.Content + ' 太复杂了'
    
        if (content === '1') {
          reply = '天下第一吃大米'
        }
        else if (content === '2') {
          reply = '天下第二吃豆腐'
        }
        else if (content === '3') {
          reply = '天下第三吃仙丹'
        }
        this.body = reply
    }    
    yield next  

}