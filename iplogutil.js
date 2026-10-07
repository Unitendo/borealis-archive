#!/usr/bin/env node

/*
    Borealis IP Lookup utility.
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

require('dotenv/config')
const path = require('path')
const fs = require('fs')

const USERFILE = path.join(__dirname, 'server', 'data', process.env.BOREALIS_USERFILE)
const IPLOG = path.join(__dirname, 'server', 'data', process.env.BOREALIS_IPLOG)

const users = {}
const iplog = {}

{
    const data = fs.readFileSync(USERFILE, { encoding: 'utf-8' })
    const userlist = JSON.parse(data)
    for(const u of userlist) {
        users[u.uid] = u
    }
}

{
    const data = fs.readFileSync(IPLOG, { encoding: 'utf-8' })
    const iplist = JSON.parse(data)
    for(const u in iplist) {
        iplog[u] = iplist[u]
    }
}

const login = process.argv[2]
if(!login) {
    console.log(`Usage: ${process.argv0} ${process.argv[1]} [-l] <login>`)
    console.log('Fetches user named <login> and prints their info and IP')
    console.log('-l: lists all users')
    process.exit(1)
}

if(login === '-l') {
    const userlist = Object.values(users).map(u => u.login)
    console.log(`User list (${userlist.length}): `, userlist)
    process.exit(0)
}

const user = Object.values(users).find(u => u.login === login)
if(!user) {
    console.log(`User named ${login} not found.`)
    process.exit(1)
}

const ip = iplog[user.uid]

console.log('UID:          ', user.uid)
console.log('Login:        ', user.login)
console.log('Password Hash:', user.passwd)
console.log('IP Address:   ', ip)
