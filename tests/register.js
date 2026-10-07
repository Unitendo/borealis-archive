const AUR_HOST = 'localhost'
const AUR_URL = `http://${AUR_HOST}:3072/`
const AUR_API = `${AUR_URL}api`

console.log(AUR_HOST)

const AUR_USER = 'jakub'
const AUR_PASSWD = 'password'

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

    await aurrequest({
        cmd: 'MAKEACC',
        username: AUR_USER,
        password: AUR_PASSWD
    })
}

client()
