'use strict'

var ejs = require('ejs')
var heredoc = require('heredoc')

// 消息响应模块
// 用户回复针对不同消息类型的消息模板（上一步程序根据用户请求类型已经准备好了要自动回复的消息对象）
var tpl = heredoc(function() { /*
  <xml>
  <ToUserName><![CDATA[<%= toUserName %>]]></ToUserName>
  <FromUserName><![CDATA[<%= fromUserName %>]]></FromUserName>
  <CreateTime><%= createTime %></CreateTime>
  <MsgType><![CDATA[<%= msgType %>]]></MsgType>
  <% if (msgType === 'text') { %>
    <Content><![CDATA[<%- content %>]]></Content>
  <% } else if (msgType === 'image') { %>
    <Image>
      <MediaId><![CDATA[<%= content.mediaId %>]]></MediaId>
    </Image>
  <% } else if (msgType === 'voice') { %>
    <Voice>
      <MediaId><![CDATA[<%= content.mediaId %>]]></MediaId>
    </Voice>
  <% } else if (msgType === 'video') { %>
    <Video>
      <MediaId><![CDATA[<%= content.mediaId %>]]></MediaId>
      <Title><![CDATA[<%= content.title %>]]></Title>
      <Description><![CDATA[<%= content.description %>]]></Description>
    </Video>
  <% } else if (msgType === 'music') { %>
    <Music>
      <Title><![CDATA[<%= content.title %>]]></Title>
      <Description><![CDATA[<%= content.description %>]]></Description>
      <MusicUrl><![CDATA[<%= content.musicUrl %>]]></MusicUrl>
      <HQMusicUrl><![CDATA[<%= content.hqMusicUrl %>]]></HQMusicUrl>
      <ThumbMediaId><![CDATA[<%= content.thumbMediaId %>]]></ThumbMediaId>
    </Music>
  <% } else if (msgType === 'news') { %>
    <ArticleCount><%= content.length %></ArticleCount>
    <Articles>
    <% content.forEach(function(item) { %>
      <item>
        <Title><![CDATA[<%= item.title %>]]></Title>
        <Description><![CDATA[<%= item.description %>]]></Description>
        <PicUrl><![CDATA[<%= item.picUrl %>]]></PicUrl>
        <Url><![CDATA[<%= item.url %>]]></Url>
      </item>
    <% }) %>
    </Articles>
  <% } %>
  </xml>
*/})

// 使用 ejs 编译模板
var compiled = ejs.compile(tpl)

exports = module.exports = {
    compiled: compiled
}
  