/*
    Borealis V4 Web & SocketIO Module.
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
const path = require('path')
const socketio = require('socket.io')

/**
 * @typedef {import('./borealis')} Borealis 
 */

/**
 * @param {Borealis} server 
 */
module.exports = function(server) {
    /**
     * @type { {app: express.Express} }
     */
    const { app, http } = server
    if(!app) {
        console.error('Express has not been initialized!')
        process.exit(1)
    }

    if(!http) {
        console.error('HTTP has not been initialized!')
        process.exit(1)
    }

    app.get('/', (req, res) => res.redirect('/web/'))

    app.use('/web', express.static(
        path.join(__dirname, 'web')
    ))

    const io = socketio(http)

    io.on('connection', socket => {
        const bc = server.connect({
            send: msg => socket.emit('message', server.v4MessageTranslate(msg))
        })

        bc.join('general')

        socket.on('disconnect', (reason, details) => {
            bc.disconnect()
        })
    })

    console.log('Web server live')
}
