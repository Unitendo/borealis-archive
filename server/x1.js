/*
    Borealis X1 Module.
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

/**
 * @typedef {import('./borealis')} Borealis 
 */

/**
 * @param {Borealis} server 
 */
module.exports = function(server) {
    if(!process.env.BOREALIS_X1_PORT) {
        console.error('Borealis X1 Port not set (set BOREALIS_X1_PORT in .env)')
        process.exit(1)
    }

    const PORT = parseInt(process.env.BOREALIS_X1_PORT)

    const tcp = net.createServer( client => {
        function send(data) {
            client.write(`${JSON.stringify(data)}\r\n`)
        }

        function message(command) {
            if(!connection.login) return send( {data: 'nologin'} )
            /**
             * @type { { content: String, channel: String, platform: String, cmd: String} }
             */
            const { content, channel, platform, cmd } = command
            const stripped = content.trim()
            if(!stripped) return send( {data: 'ok'} )
            if(platform) if(platform.length > 30) return res.send( {data: 'illegal'} )
            
            server.send({
                type: cmd.toUpperCase(),
                channel: channel,
                author: connection.login,
                content: stripped,
                platform: platform ? platform : 'X1'
            })

            send( {data: 'ok'} )
        }
        
        const bc = server.connect({
            send: msg => client.write(`${JSON.stringify(msg)}\r\n`)
        })

        const connection = {
            login: undefined
        }

        client.on('close', () => {
            bc.disconnect()
            if(!connection.login) return
            server.send({ type: 'SYSMSG', content: `Goodbye, ${connection.login}!` })
        })

        client.on('data', data => {
            try {
                const commands = data.toString('utf-8').split('\n')
                for(const c of commands) {
                    const trimmed = c.trim()
                    if(!trimmed) continue
                    const command = JSON.parse(trimmed)
                    /**
                     * @type { {cmd: String} }
                     */
                    const {cmd} = command
                    switch(cmd.toLowerCase()) {
                        case 'login':
                            const { login, passwd } = command
                            if(!login) return send( {data: 'nologin'} )
                            if(!passwd) return send( {data: 'nopasswd'} )
                            const rawip = client.address().address
                            const ip = server.computeIP(rawip)
                            
                            const err = server.auth(login, passwd, ip)
                            if(err) return send( {data: err.toLowerCase()} )
                            
                            connection.login = login
                            server.send({ type: 'SYSMSG', content: `Hello, ${login}!` })

                            send( {data: 'ok'} )
                        break

                        case 'register': {
                            const { login, passwd } = command
                            if(!login) return send( {data: 'nologin'} )
                            if(!passwd) return send( {data: 'nopasswd'} )
                            const rawip = client.address().address
                            const ip = server.computeIP(rawip)

                            const err = server.register(login, passwd, ip)
                            if(err) return send( {data: err.toLowerCase()} )
                            send( {data: 'ok'} )
                        } break
                        
                        case 'join': {
                            const { channel } = command
                            if(channel) bc.join(channel)
                            send( {data: 'ok'} )
                        } break

                        case 'part': {
                            const { channel } = command
                            if(channel) bc.part(channel)
                            send( {data: 'ok'} )
                        } break

                        case 'msg':
                            message(command)
                        break

                        case 'botmsg':
                            message(command)
                        break

                        case 'intmsg':
                            message(command)
                        break

                        case 'sysmsg': {
                            /**
                             * @type { { content: String, channel: String, platform: String, cmd: String} }
                             */
                            const { content, channel, platform, cmd } = command
                        } break

                        default:
                            send( {data: 'badcmd'} )
                    }
                }
            } catch(e) {
                console.error(e)
                send( {data: 'err'} )
            }
        })

        client.write('BOREALIS:X1\r\n')
    } )

    tcp.listen(PORT, () => console.log('X1 Server live on port', PORT))
}
