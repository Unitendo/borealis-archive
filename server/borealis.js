/*
    Borealis Server Core.
    Copyright (C) 2026  Jakub Kwantowy

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const users = require('./users')

const BorealisServer = function() {
    /**
     * @type {BorealisClient[]}
     */
    this.clients = []
}

/**
 * Computes a standard form for an IP address
 * 
 * @param {Object} rawip 
 * @returns {String}
 */
BorealisServer.prototype.computeIP = function(rawip) {
    return users.computeIP(rawip)
}

/**
 * Creates a user account.
 * 
 * @param {String} login 
 * @param {String} passwd 
 * @param {String} ip
 * @returns {String | undefined}
 */
BorealisServer.prototype.register = function(login, passwd, ip) {
    if(users.checkIPBan(ip)) {
        console.log('IP Banned login attempt from', ip, ':', login)
        return 'BANNED'
    }
    const user = users.createUser(login, passwd)
    if(typeof user === 'string')
        return user

    users.logIP(user.uid, ip)
    return undefined
}

/**
 * Checks if you can log in.
 * 
 * @param {String} login 
 * @param {String} passwd 
 * @param {String} ip
 * @returns {String | undefined} error
 */
BorealisServer.prototype.auth = function(login, passwd, ip) {
    if(users.checkIPBan(ip)) {
        console.log('IP Banned login attempt from', ip, ':', login)
        return 'BANNED'
    }
    const user = users.getUserByLogin(login)
    if(!user) return 'LOGIN_FAKE_ACC'
    if(!user.comparePasswd(passwd)) return 'LOGIN_FAKE_ACC'
    if(users.checkBan(user.uid)) {
        console.log('Banned login attempt from', ip, ':', login)
        return 'BANNED'
    }
    users.logIP(user.uid, ip)
    return undefined
}

/**
 * Creates a client
 * 
 * @param {ClientFuncs} funcs 
 * @returns {BorealisClient}
 */
BorealisServer.prototype.connect = function(funcs) {
    const client = new BorealisClient(this, funcs)
    this.clients.push(client)
    return client
}

/**
 * @param {Message} msg 
 */
BorealisServer.prototype.send = function(msg) {
    if(msg.type !== 'SYSMSG') if(!msg.channel) msg.channel = 'general'
    console.log(msg)
    for(const c of this.clients) {
        if(msg.type === 'SYSMSG') {
            c.send(msg)
            continue
        }
        if(c.channels.includes(msg.channel)) c.send(msg)
    }
}

/**
 * @typedef { { uid: String, login: String, passwd: String } } Userobj
 */

/**
 * 
 * @param {String} login 
 * @returns {Userobj | undefined} 
 */
BorealisServer.prototype.getUserByLogin = function(login) {
    return users.getUserByLogin(login)
}

/**
 * @typedef { { type: String, author: String, channel: String, platform: String, content: String } } Message
 */

/**
 * @callback SendCallback
 * @param {Message} msg
 */

/**
 * @typedef { { send: SendCallback } } ClientFuncs
 */

/**
 * @param {BorealisServer} server 
 * @param {ClientFuncs} funcs
 */
const BorealisClient = function(server, funcs) {
    this.server = server
    this.funcs = funcs
    this.channels = []
}

/**
 * @param {Message} msg 
 */
BorealisClient.prototype.send = function(msg) {
    this.funcs.send(msg)
}

BorealisClient.prototype.disconnect = function() {
    const idx = this.server.clients.indexOf(this)
    if(idx == -1) return
    this.server.clients.splice(idx, 1)
}

/**
 * @param {String} channel 
 */
BorealisClient.prototype.join = function(channel) {
    if(!this.channels.includes(channel)) 
        this.channels.push(channel)
}

/**
 * @param {String} channel 
 */
BorealisClient.prototype.part = function(channel) {
    const idx = this.channels.indexOf(channel)
    if(idx === -1) return 
    this.channels.splice(idx, 1)
}

module.exports = BorealisServer
