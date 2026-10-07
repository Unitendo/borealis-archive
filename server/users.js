/*
    Borealis User Interface.
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

const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const uuid = require('uuid')
const {Address6} = require('ip-address')

if(!process.env.BOREALIS_USERFILE) {
    console.error('Borealis User file not set (set BOREALIS_USERFILE in .env)')
    process.exit(1)
}

if(!process.env.BOREALIS_IPLOG) {
    console.error('Borealis IP Log file not set (set BOREALIS_IPLOG in .env)')
    process.exit(1)
}

if(!process.env.BOREALIS_IPBANLIST) {
    console.error('Borealis IP ban list file not set (set BOREALIS_IPBANLIST in .env)')
    process.exit(1)
}

if(!process.env.BOREALIS_BANLIST) {
    console.error('Borealis ban list file not set (set BOREALIS_BANLIST in .env)')
    process.exit(1)
}

if(!process.env.BOREALIS_USERSAVEINTERVAL) {
    console.error('Borealis User file save interval not set (set BOREALIS_USERSAVEINTERVAL in .env)')
    process.exit(1)
}

/**
 * Computes a standard form for an IP address
 * 
 * @param {Object} rawip 
 * @returns {String}
 */
function computeIP(rawip) {
    const ip6 = new Address6(rawip)
    const canon = ip6.canonicalForm()
    if(canon === '0000:0000:0000:0000:0000:0000:0000:0000') return '0000:0000:0000:0000:0000:ffff:7f00:0001' // localhost bypass
    return canon
}

const USERFILE = path.join(__dirname, 'data', process.env.BOREALIS_USERFILE)
const IPLOG = path.join(__dirname, 'data', process.env.BOREALIS_IPLOG)
const IPBANLIST = path.join(__dirname, 'data', process.env.BOREALIS_IPBANLIST)
const BANLIST = path.join(__dirname, 'data', process.env.BOREALIS_BANLIST)
const SAVEINTERVAL = parseInt(process.env.BOREALIS_USERSAVEINTERVAL) * 1000
const SALTROUNDS = 12

/**
 * @type { Object.<string, User> }
 */
const users = {}

/**
 * @type { Object.<string, string> }
 */
const iplog = {}

/**
 * @type { String[] }
 */
const ipbans = []

/**
 * @type { String[] }
 */
const bans = []

/**
 * @param {String} uid
 * @param {String} login 
 * @param {String} passwd 
 */
const User = function(uid, login, passwd) {
    this.uid = uid
    this.login = login
    this.passwd = passwd
}

/**
 * @param {String} passwd 
 * @returns {Boolean}
 */
User.prototype.comparePasswd = function(passwd) {
    return bcrypt.compareSync(passwd, this.passwd)
}

/**
 * @param { { uid: String, login: String, passwd: String } } param0 
 * @returns {User}
 */
User.fromJSON = function({ uid, login, passwd }) {
    return new User(uid, login, passwd)
}

/**
 * @param {String} login
 * @returns {Number} 0 = Invalid, 1 = Valid
 */
User.isLoginValid = function(login) {
    const regex = /^[a-zA-Z1-9\._]{2,32}$/
    return login.match(regex).length
}

function getUniqueUserId() {
    let candidate = uuid.v4()
    while(candidate in users) {
        candidate = uuid.v4()
    }
    return candidate
}

/**
 * @param {String} login 
 * @param {String} passwd 
 * 
 * @returns {User | string}
 */
function createUser(login, passwd) {
    if(!User.isLoginValid(login)) return 'ILLEGAL'
    if(getUserByLogin(login)) return 'USR_IN_USE'

    const uid = getUniqueUserId()
    const hash = bcrypt.hashSync(passwd, SALTROUNDS)

    const user = new User(uid, login, hash)
    users[uid] = user
    return user
}

/**
 * @param {String} uid 
 * @returns {User | undefined}
 */
function getUserByUid(uid) {
    if(uid in users)
        return users[uid]
    return undefined
}

/**
 * @param {String} login
 * @returns {User | undefined}
 */
function getUserByLogin(login) {
    const userlist = Object.values(users)
    return userlist.find(u => u.login === login)
}

/**
 * @param {String} uid 
 * @param {String} ip 
 */
function logIP(uid, ip) {
    iplog[uid] = ip
}

/**
 * @param {String} ip 
 * @returns {Boolean}
 */
function checkIPBan(ip) {
    return ipbans.includes(ip)
}

/**
 * @param {String} uid 
 * @returns {Boolean}
 */
function checkBan(uid) {
    return bans.includes(uid)
}

function trySaveUsers() {
    try {
        console.log('Saving users')
        const userlist = Object.values(users)
        const data = JSON.stringify(userlist)
        fs.writeFileSync(USERFILE, data, { encoding: 'utf-8' })
    } catch(e) {
        console.warn('Could not save user file', e.message)
    }

    try {
        console.log('Saving IP log')
        const data = JSON.stringify(iplog)
        fs.writeFileSync(IPLOG, data, { encoding: 'utf-8' })
    } catch(e) {
        console.warn('Could not save IP log', e.message)
    }

    try {
        console.log('Saving IP ban list')
        const data = JSON.stringify(ipbans)
        fs.writeFileSync(IPBANLIST, data, { encoding: 'utf-8' })
    } catch(e) {
        console.warn('Could not save IP ban list', e.message)
    }

    try {
        console.log('Saving ban list')
        const data = JSON.stringify(bans)
        fs.writeFileSync(BANLIST, data, { encoding: 'utf-8' })
    } catch(e) {
        console.warn('Could not save ban list', e.message)
    }

    console.log('Done')
}

function tryLoadUsers() {
    try {
        console.log('Loading users')
        const data = fs.readFileSync(USERFILE, { encoding: 'utf-8' })
        const userlist = JSON.parse(data)
        for(const u of userlist) {
            const user = User.fromJSON(u)
            users[user.uid] = user
        }
    } catch(e) {
        console.warn('Could not load user file, falling back.', e.message)
        const user = createUser('root', 'toor')
        console.log(`User ${user.login} created`)
    }

    try {
        console.log('Loading IP log')
        const data = fs.readFileSync(IPLOG, { encoding: 'utf-8' })
        const iplist = JSON.parse(data)
        for(const u in iplist) {
            iplog[u] = iplist[u]
        }
    } catch(e) {
        console.warn('Could not load IP log.', e.message)
    }

    try {
        console.log('Loading IP ban list')
        const data = fs.readFileSync(IPBANLIST, { encoding: 'utf-8' })
        const iplist = JSON.parse(data)
        for(const ip of iplist) {
            ipbans.push(computeIP(ip))
        }
    } catch(e) {
        console.warn('Could not load IP ban list.', e.message)
    }

    try {
        console.log('Loading ban list')
        const data = fs.readFileSync(BANLIST, { encoding: 'utf-8' })
        const usrlist = JSON.parse(data)
        for(const u of usrlist) {
            bans.push(u)
        }
    } catch(e) {
        console.warn('Could not load ban list.', e.message)
    }

    console.log('Done')
}

module.exports = {
    User,
    createUser,
    getUserByUid,
    getUserByLogin,
    logIP,
    computeIP,
    checkIPBan,
    checkBan
}

tryLoadUsers()

process.on('exit', trySaveUsers)
setInterval(trySaveUsers, SAVEINTERVAL)
