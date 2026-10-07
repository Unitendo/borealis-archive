/*
    Borealis V6 Module.
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

const net = require('net')
const express = require('express')
const bodyparser = require('body-parser')
const requestip = require('request-ip')
const jwt = require('jsonwebtoken')

/**
 * @typedef {import('./borealis')} Borealis 
 */

/**
 * @param {Borealis} server 
 */
module.exports = function(server) {
    function sanitize(s) {
        return s.replaceAll('%', '%25').replaceAll('|', '%7C').replaceAll('\n', '\\n')
    }

    /**
     * @param {String} s 
     * @returns {String}
     */
    function decode(s) {
        return decodeURIComponent(s.replaceAll('\\n', '\n')).trim()
    }

    const v6channels = [
        'general', 'bots', 'lounge', 'luigi-chat'
    ]

    if(!process.env.BOREALIS_HTTP_V6_PORT) {
        console.error('Borealis HTTP Port not set (set BOREALIS_HTTP_V6_PORT in .env)')
        process.exit(1)
    }

    if(!process.env.BOREALIS_TCP_V6_PORT) {
        console.error('Borealis TCP Port not set (set BOREALIS_TCP_V6_PORT in .env)')
        process.exit(1)
    }

    const TOKEN_EXPIRE = process.env.BOREALIS_V6_TOKEN_EXPIRE
    const SECRET = process.env.BOREALIS_V6_SECRET
    const HTTP_PORT = parseInt(process.env.BOREALIS_HTTP_V6_PORT)
    const TCP_PORT = parseInt(process.env.BOREALIS_TCP_V6_PORT)

    const tcp = net.createServer( client => {
        const bc = server.connect({
            send: msg => {
                if(msg.type === 'SYSMSG') {
                    client.write(`BOREALIS SERVER|${sanitize(msg.content)}|general|\r\n`)
                    return
                }
                client.write(`${sanitize(msg.author)}|${sanitize(msg.content)}|${sanitize(msg.channel)}|\r\n`)
            }
        })

        for(const c of v6channels) 
            bc.join(c)

        client.on('close', () => {
            bc.disconnect()
        })
    } )

    tcp.listen(TCP_PORT, () => console.log('TCP V6 Server live on port', TCP_PORT))

    const app = express()

    /**
     * @param {express.Request} req 
     * @param {express.Response} res 
     * @param {express.NextFunction} next 
     */
    function verifyToken(req, res, next) {
        const { auth } = req.headers
        if(!auth)
            return res.contentType('text/plain').send('ERR_INVALID_TOKEN')

        try {
            const token = jwt.decode(auth, SECRET)
            if(!token) return res.contentType('text/plain').send('ERR_INVALID_TOKEN')
            req.user = token
            next()
        } catch(e) {
            console.error(e)
            return res.contentType('text/plain').send('ERR_INVALID_TOKEN')
        }
    }

    app.use(bodyparser.text())
    app.post('/api/test', (req, res) => {
        function getIP() {
            const rawip = requestip.getClientIp(req)
            return server.computeIP(rawip)
        }

        console.log('V6 test from', getIP())
        res.contentType('text/plain').send('Online')
    })

    app.post('/api/rooms', (req, res) => {
        res.contentType('text/plain').send(`${v6channels.length}|${v6channels.join('|')}|`)
    })

    app.post('/api/signup', (req, res) => {
        if(!req.body) return res.contentType('text/plain').send('ERR_MISSING_INPUT')
        const [login, passwd] = req.body.split('|')
        if(!login) return res.contentType('text/plain').send('ERR_MISSING_INPUT')
        if(!passwd) return res.contentType('text/plain').send('ERR_MISSING_INPUT')

        function getIP() {
            const rawip = requestip.getClientIp(req)
            return server.computeIP(rawip)
        }

        const err = server.register(login, passwd, getIP())
        switch(err) {
            case undefined:
                const user = server.getUserByLogin(login)
                if(!user) return res.end() // By virtue of the previous statements, this case should be impossible. Also makes the VSCode typechecker happy.
                const token = jwt.sign( { uid: user.uid, login: user.login }, SECRET, { expiresIn: TOKEN_EXPIRE } )
                res.contentType('text/plain').send(token)
                server.send({ type: 'SYSMSG', content: `Hello, ${login}!` })
            break

            case 'USR_IN_USE':
                res.contentType('text/plain').send('ERR_USER_USED')
            break

            case 'ILLEGAL':
                res.contentType('text/plain').send('ERR_ILLEGAL')
            break

            case 'BANNED':
                res.contentType('text/plain').send('ERR_BANNED')
            break

            default:
                res.contentType('text/plain').send(err)
        }
    })

    app.post('/api/login', (req, res) => {
        if(!req.body) return res.contentType('text/plain').send('ERR_MISSING_INPUT')
        const [login, passwd] = req.body.split('|')
        if(!login) return res.contentType('text/plain').send('ERR_MISSING_INPUT')
        if(!passwd) return res.contentType('text/plain').send('ERR_MISSING_INPUT')

        function getIP() {
            const rawip = requestip.getClientIp(req)
            return server.computeIP(rawip)
        }

        const err = server.auth(login, passwd, getIP())
        switch(err) {
            case undefined:
                const user = server.getUserByLogin(login)
                if(!user) return res.end() // By virtue of the previous statements, this case should be impossible. Also makes the VSCode typechecker happy.
                const token = jwt.sign( { uid: user.uid, login: user.login }, SECRET, { expiresIn: TOKEN_EXPIRE } )
                res.contentType('text/plain').send(token)
                server.send({ type: 'SYSMSG', content: `Hello, ${login}!` })
            break

            case 'LOGIN_FAKE_ACC':
                res.contentType('text/plain').send('ERR_WRONG_PASS')
            break

            case 'BANNED':
                res.contentType('text/plain').send('ERR_BANNED')
            break

            default:
                res.contentType('text/plain').send(err)
        }
    })

    app.post('/api/chat', verifyToken, (req, res) => {
        if(!req.body) return res.contentType('text/plain').send('ERR_NO_BODY')
        const [ rawmessage, channel ] = req.body.split('|')
        const message = decode(rawmessage)
        
        if(!message) return res.contentType('text/plain').send('OK')

        server.send({
            type: 'MSG',
            channel: channel,
            author: req.user.login,
            content: message,
            platform: 'V6'
        })

        res.contentType('text/plain').send('OK')
    })

    app.listen(HTTP_PORT, () => console.log('HTTP V6 Server live on port', HTTP_PORT))
}
