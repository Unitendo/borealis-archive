const net = require('net')

const AUR_HOST = 'localhost'
const AUR_TCP_PORT = 4040
const AUR_URL = `http://${AUR_HOST}:3072/`
const AUR_API = `${AUR_URL}api`

console.log(AUR_HOST)

const AUR_USER = 'root'
const AUR_PASSWD = 'toor'

function aurrequest(body) {
    return fetch(AUR_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'balls'
        },
        body: JSON.stringify(body)
    }).then(v => v.text()).then(console.log)
}

async function client() {
    await aurrequest({
        cmd: 'CONNECT', version: 4.5
    })

    const socket = net.connect(AUR_TCP_PORT, AUR_HOST)
    socket.addListener('close', () => process.exit())
    socket.addListener('data', data => console.log(data.toString('utf-8')))

    await aurrequest({
        cmd: 'LOGINACC',
        username: AUR_USER,
        password: AUR_PASSWD
    })
}

client()

process.stdin.on('data', data => {
    aurrequest({
        cmd: 'CHAT',
        platform: 'client.js',
        content: data.toString()
    })
})
