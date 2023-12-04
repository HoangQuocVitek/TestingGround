const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const app = express();

const server = http.createServer(app);
const io = require('socket.io')(server);

app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'tajnasekret',
  resave: false,
  saveUninitialized: true,
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

const con = mysql.createConnection({
  host: '192.168.1.161',
  user: 'vitek.hoang',
  password: 'BookOfDarkness',
  database: 'vitek.hoang',
  port: 3001
});

con.connect(function(err) {
  if (err) throw err;
  console.log('Connected to MySQL!');
});

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('chat message', (message) => {
    console.log('Received message: ' + message);
    io.emit('chat message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.post('/vitek.hoang', function (request, response, next) {
  const { username, email, password, confirmPassword } = request.body;

  if (password !== confirmPassword) {
    return response.status(400).send('Passwords do not match');
  }

  const sql = `INSERT INTO userdatabase (username, email, password) VALUES (?, ?, ?)`;
  con.query(sql, [username, email, password], (error, results, fields) => {
    if (error) {
      console.error(error);
      return response.status(500).send('Error inserting into the database');
    }
    console.log('User inserted into the database');
    response.send('User inserted into the database');
  });
});

app.get('/registrace', (req, res) => {
  res.render('registrace');
});

app.get('/login', (req, res) => {
  res.render('login');
});

const port = 80;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
