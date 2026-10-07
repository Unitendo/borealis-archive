/*
    Borealis Server Software.
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

console.log("Borealis Server  Copyright (C) 2026  Jakub Kwantowy")
console.log("This program comes with ABSOLUTELY NO WARRANTY.")
console.log("This is free software, and you are welcome to redistribute it")
console.log("under certain conditions; check the included 'LICENSE' file for details.")
console.log()

require('dotenv/config')
const fs = require('fs')
const path = require('path')

const DATADIR = path.join(__dirname, 'server', 'data')

if(!fs.existsSync(DATADIR)) {
    console.log('Cannot find data directory. Creating from scratch.')
    fs.mkdirSync(DATADIR)
}

const Borealis = require('./server/borealis')
const x1 = require('./server/x1')
const v6 = require('./server/v6')
const httpapi_v4 = require('./server/httpapi-v4')
const tcp_v4 = require('./server/tcp-v4')
const web_v4 = require('./server/web-v4')

const server = new Borealis()

process.on('SIGINT', () => process.exit(0))
process.on('SIGUSR2', () => process.exit(0))

x1(server)
v6(server)
httpapi_v4(server)
tcp_v4(server)
web_v4(server)

process.stdin.on('data', data => {
    const msg = 'SERVER TTY MESSAGE: ' + data.toString('utf-8').trim()
    server.send({ type: 'SYSMSG', content: msg })
})
