const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/video', (req, res) => {
    const range = req.headers.range;
    if (!range) return res.status(400).send('Range header required');

    const videoPath = './movie.mp4';
    const videoSize = fs.statSync(videoPath).size;
    const CHUNK_SIZE = 1e6;
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4"
    });

    fs.createReadStream(videoPath, { start, end }).pipe(res);
});

io.on('connection', socket => {
    let username = 'Anonymous';

    socket.on('set username', name => {
        username = name || 'Anonymous';
        socket.broadcast.emit('chat message', { user: 'System', text: `${username} joined the watch party!` });
    });

    socket.on('play', time => socket.broadcast.emit('play', time));
    socket.on('pause', time => socket.broadcast.emit('pause', time));
    socket.on('seek', time => socket.broadcast.emit('seek', time));

    socket.on('chat message', msg => {
        socket.broadcast.emit('chat message', { user: username, text: msg });
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('chat message', { user: 'System', text: `${username} left the room.` });
    });
});
 
server.listen(3000, () => {
    console.log('✅ Server running at http://localhost:3000');
});
