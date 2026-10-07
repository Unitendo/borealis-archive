function aurrequest(body) {
    return fetch('/api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(v => v.json()).then(console.log)
}

async function main() {
    const maindiv = document.getElementById('main')
    const messagesPre = document.getElementById('messages')
    
    await aurrequest({
        cmd: 'CONNECT', version: 4.5
    })

    const socket = io()

    socket.on('message', data => {
        messagesPre.append(data, '\n')
        messagesPre.scrollTop = messagesPre.scrollHeight
    })

    socket.on('disconnect', () => window.location.reload())

    /**
     * @type {HTMLFormElement}
     */
    const loginform = document.getElementById('login')
    loginform.addEventListener('submit', e => {
        e.preventDefault()

        const usernameElement = loginform.elements.username
        const passwordElement = loginform.elements.password

        const username = usernameElement.value
        const password = passwordElement.value

        passwordElement.value = ''

        aurrequest({
            cmd: 'LOGINACC',
            username: username,
            password: password
        })

        loginform.style.display = 'none'
        maindiv.style.display = ''
    })

    /**
     * @type {HTMLFormElement}
     */
    const registerform = document.getElementById('register')
    registerform.addEventListener('submit', e => {
        e.preventDefault()

        const usernameElement = registerform.elements.username
        const passwordElement = registerform.elements.password
        const password2Element = registerform.elements.password2

        const username = usernameElement.value
        const password = passwordElement.value
        const password2 = password2Element.value

        passwordElement.value = ''
        password2Element.value = ''

        if(password !== password2) 
            return alert('Passwords must match!')

        aurrequest({
            cmd: 'MAKEACC',
            username: username,
            password: password
        })

        registerform.style.display = 'none'
        loginform.style.display = ''
    })

    /**
     * @type {HTMLFormElement}
     */
    const inputsform = document.getElementById('inputs')
    inputsform.addEventListener('submit', e => {
        e.preventDefault()

        const messageElement = inputsform.elements.message

        const message = messageElement.value
        messageElement.value = ''

        aurrequest({
            cmd: 'CHAT',
            platform: 'Web',
            content: message
        })
    })

    const loginbtnsDiv = document.getElementById('loginbtns')
    const loginbtn = document.getElementById('loginbtn')
    const registerbtn = document.getElementById('registerbtn')
    loginbtn.addEventListener('click', e => {
        loginbtnsDiv.style.display = 'none'
        loginform.style.display = ''
    })

    registerbtn.addEventListener('click', e => {
        loginbtnsDiv.style.display = 'none'
        registerform.style.display = ''
    })
}

window.addEventListener('load', main)
