const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require("socket.io")(
    server,
    {
        cors: {
            origin: ['http://localhost:5173', 'http://192.168.1.77:5173'],
        }
    },
)
const port = 8080


app.get('/', (req, res) =>{
    res.send('Welcome home!');
});

server.listen(port, () => {
    console.log('WebRTC App listening on port ' + port);
});


io.on('connection', socket => {
    console.log(socket.id);

    socket.emit('connection-success', {
        status: "connection-success",
        socketId: socket.id
    })

    socket.on('sdp', data => {
        console.log(data);

        // Sending the sdp to other peers
        socket.broadcast.emit('sdp', data)
    })
    socket.on('closed', () => socket.broadcast.emit('closed'));
    socket.on('candidate', data => {
        socket.broadcast.emit('candidate',  data);
    })

    socket.on('disconnect', () =>{
        console.log(`${socket.id} disconnected`);
    });
})