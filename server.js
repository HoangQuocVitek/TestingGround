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
  req.session.username = 'JohnDoe';
  res.send('Session data set.');
});
//vypise session do dokumentu
app.get('/get', (req, res) => {
  const username = req.session.username;
  res.send('Username from session: ' + username);
});
//posle soubor HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//zajistuje chat
io.on('connection', (socket) => {
  console.log('Nový uživatel připojen');

  socket.on('chat message', (message) => {
    console.log('Přijata zpráva: ' + message);
    io.emit('chat message', message);
  });

  socket.on('disconnect', () => {
    console.log('Uživatel odpojen');
  });
});

const port = 80;
http.listen(port, () => {
  console.log(`Server běží na adrese http://localhost:${port}`);
});
