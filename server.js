const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const formatMessage = require('./utils/messages')
const {userJoin, getCurrentUser, userLeaves, getRoomUsers} = require('./utils/users')

const serverName = 'Server'
const app = express()
const server = http.createServer(app)
const io = socketio(server)

//Set static folder
const staticFolder = path.join(__dirname, 'public')
app.use(express.static(staticFolder))

//Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({username, room}) => {
        const user = userJoin(socket.id, username, room)

        socket.join(user.room)
        //Only to one user
        socket.emit('message', formatMessage(serverName, 'Welcome to ChatCord'))

        //Broadcast when a user connects ( every user except that one who connected )
        socket.broadcast.to(user.room).emit('message', formatMessage(serverName, `${user.username} has joined the chat`))

        //Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    })

    //To everyone
    // io.emit()

    //Listen for chatMessage
    socket.on('chatMessage', (msg) => {
        // console.log(msg)
        const user = getCurrentUser(socket.id)
        io.to(user.room).emit('message', formatMessage(user.username, msg))
    })
    //Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeaves(socket.id)

        if (user) {
            io.to(user.room).emit('message', formatMessage(serverName, `${user.username} has left the chat`))
            //Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    })
})

const PORT = 3000 || process.env.PORT

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
