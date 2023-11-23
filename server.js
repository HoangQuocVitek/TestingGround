const express = require('express');
const session = require('express-session');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

// Nastavení session middleware
app.use(session({
  secret: 'tajnasekret',
  resave: false,
  saveUninitialized: true,
}));

//nastavi session do cookies
app.get('/set', (req, res) => {
  req.session.username = 'User'; // Default username for the /set route
  res.send('Session data set.');
});

//vypise session do dokumentu
app.get('/get', (req, res) => {
  const username = req.session.username;
  res.send('Username from session: ' + username);
});

// Serve the "formular.html" file when accessing /formular
app.get('/formular', (req, res) => {
  res.sendFile(__dirname + '/public/formular.html');
});

//zajistuje chat
const socketToUsername = new Map();

io.on('connection', (socket) => {
  console.log('Nový uživatel připojen');

  // Get the IP address of the connected client
  const clientIp = socket.handshake.address;
  socketToUsername.set(socket, clientIp);

  socket.on('chat message', (message) => {
    // Get the username associated with the socket (IP address)
    const username = socketToUsername.get(socket);
    console.log(`Přijata zpráva od ${username}: ${message}`);
    io.emit('chat message', `${username}: ${message}`);
  });

  socket.on('disconnect', () => {
    const username = socketToUsername.get(socket);
    console.log(`Uživatel ${username} odpojen`);
    socketToUsername.delete(socket);
  });
});

const port = 80;
http.listen(port, () => {
  console.log(`Server běží na adrese http://localhost:${port}`);
});
