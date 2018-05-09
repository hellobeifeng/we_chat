'use strict'

// 全局工具方法

var fs = require('fs')
var Promise = require('bluebird')

/**
 * 读取文件方法，返回 Promise
 * @param {String} fpath 要读取的文件路径
 * @param {String} encoding 编码方式
 */
exports.readFileAsync = function(fpath, encoding) {
    return new Promise(function(resolve, reject) {
        fs.readFile(fpath, encoding, function(err, content) {
            if (err) reject(err)
            resolve(content)
        })
    })
}

/**
 * 写文件方法，返回 Promise
 * @param {String} fpath 要读取的文件路径
 * @param {String} content 内容
 */
exports.writeFileAsync = function(fpath, content) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(fpath, content, function(err) {
            if(err) reject(err)
            else resolve()
        })
    })
}