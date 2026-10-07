/*
    Borealis V4 HTTP Module.
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

const express = require('express')
const http = require('http')
const bodyparser = require('body-parser')
const requestip = require('request-ip')

/**
 * @typedef {import('./borealis')} Borealis 
 */

/**
 * @param {Borealis} server 
 */
module.exports = function(server) {
    const V4client = function() {
        this.username = undefined
    }

    /**
     * @type { { Object.<object, V4client> } }
     */
    const clients = {}
    server.v4clients = clients

    server.v4MessageTranslate = msg => {
        switch(msg.type.toLowerCase()) {
            case 'sysmsg':
                return msg.content

            case 'msg':
                return `(${msg.platform}) <${msg.author}> ${msg.content}`

            case 'botmsg':
                return `(${msg.platform}) [${msg.author}] ${msg.content}`

            case 'intmsg':
                return `(${msg.platform}) {${msg.author}} ${msg.content}`
        }
    }

    if(!process.env.BOREALIS_HTTP_V4_PORT) {
        console.error('Borealis HTTP Port not set (set BOREALIS_HTTP_V4_PORT in .env)')
        process.exit(1)
    }

    const PORT = parseInt(process.env.BOREALIS_HTTP_V4_PORT)
    const RAWKEY = process.env.BOREALIS_HTTP_RAWKEY

    const app = express()
    const httpserver = new http.Server(app)
    server.app = app
    server.http = httpserver

    app.use('/api', bodyparser.json())
    app.post('/api', (req, res) => {
        const { body } = req
        if(!body) return res.status(400).json( {data: 'NO_JSON'} )
        
        function getIP() {
            const rawip = requestip.getClientIp(req)
            return server.computeIP(rawip)
        }

        /**
         * @param {Object} ip 
         * @returns {V4client | undefined}
         */
        function clientCheck(ip) {
            const client = clients[ip]
            if(client) return client
            res.send( {data: 'NOT_CONNECTED'} )
            return undefined
        }

        function sendmsg({ type, author, platform, content }) {
            server.send({ type: type, author: author, platform: platform, content: content })
        }

        /**
         * @type { {cmd: String} }
         */
        const { cmd } = body
        switch(cmd.toLowerCase()) {
            case 'connect': {
                const ip = getIP()

                if(clients[ip]) return res.json( {data: 'CONNECT_OK'} )

                const client = new V4client()
                clients[ip] = client

                res.json( {data: 'CONNECT_OK'} )
            } break

            case 'makeacc': {
                const ip = getIP()
                const client = clientCheck(ip)
                if(!client) return

                /**
                 * @type { { username: String, passwd: String } }
                 */
                const { username, password } = body
                if(!username) 
                    return res.json( {data: 'USR_NOLOGIN'} )
                if(!password) 
                    return res.json( {data: 'USR_NOPASSWD'} )

                const err = server.register(username, password, ip)
                if(err) return res.json( {data: err} )
                res.json( {data: 'USR_CREATED'} )
            } break

            case 'loginacc': {
                const ip = getIP()
                const client = clientCheck(ip)
                if(!client) return

                /**
                 * @type { { username: String, passwd: String } }
                 */
                const { username, password } = body
                if(!username) 
                    return res.json( {data: 'LOGIN_NOUSERNAME'} )
                if(!password) 
                    return res.json( {data: 'LOGIN_NOPASSWORD'} )

                const err = server.auth(username, password, ip)
                if(err) return res.json( {data: err} )
                
                client.username = username
                server.send({ type: 'SYSMSG', content: `Hello, ${username}!` })
                
                res.json( {data: 'LOGIN_OK'} )
            } break

            case 'chat': {
                const ip = getIP()
                const client = clientCheck(ip)
                if(!client) return

                if(!client.username) return res.send( {data: 'NO_LOGIN'} )
                
                /**
                 * @type { {content: String, platform: String} }
                 */
                const { content, platform } = body
                const stripped = content.trim()
                if(!stripped) return res.send( {data: 'MSG_SENT'} ) // Removes empty messages
                if(platform.length > 30) return res.send( {data: 'ILLEGAL'} )

                sendmsg({ type: 'MSG', author: client.username, platform: platform, content: stripped })
                res.send( {data: 'MSG_SENT'} )
            } break

            case 'botchat': {
                const ip = getIP()
                const client = clientCheck(ip)
                if(!client) return

                if(!client.username) return res.send( {data: 'NO_LOGIN'} )
                
                /**
                 * @type { {content: String, platform: String} }
                 */
                const { content, platform } = body
                const stripped = content.trim()
                if(!stripped) return res.send( {data: 'MSG_SENT'} ) // Removes empty messages
                if(platform.length > 30) return res.send( {data: 'ILLEGAL'} )

                sendmsg({ type: 'BOTMSG', author: client.username, platform: platform, content: stripped })
                res.send( {data: 'MSG_SENT'} )
            } break

            case 'intchat': {
                const ip = getIP()
                const client = clientCheck(ip)
                if(!client) return

                if(!client.username) return res.send( {data: 'NO_LOGIN'} )
                
                /**
                 * @type { {content: String, platform: String} }
                 */
                const { content, platform } = body
                const stripped = content.trim()
                if(!stripped) return res.send( {data: 'MSG_SENT'} ) // Removes empty messages
                if(platform.length > 30) return res.send( {data: 'ILLEGAL'} )

                sendmsg({ type: 'INTMSG', author: client.username, platform: platform, content: stripped })
                res.send( {data: 'MSG_SENT'} )
            } break

            case 'rawchat': {
                res.send( {data: 'BADCMD', info: 'Rawchat for v4 has been deprecated. Please use X1!'} )
            } break

            default:
                console.log('Unknown command', cmd)
                res.status(400).json( {data: 'BADCMD'} )
        }
    })

    httpserver.listen(PORT, () => console.log('HTTP V4 Server live on port', PORT))
}
