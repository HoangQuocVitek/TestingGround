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
    response.redirect('/login');
  });
});

app.get('/registrace', (req, res) => {
  res.render('registrace');
});

app.get('/login', (req, res) => {
  const username = req.session.username || '';
  res.render('login', { username });
});

app.get('/', (req, res) => {
  const username = req.session.username || '';
  res.render('index', { username }); // Assuming your EJS file is named index.ejs
});




const port = 80;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validate credentials against the database
  const sql = `SELECT * FROM userdatabase WHERE username = ? AND password = ?`;
  con.query(sql, [username, password], (error, results, fields) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error while authenticating');
    }

    if (results.length > 0) {
      // Successful login: Create a session
      req.session.authenticated = true;
      req.session.username = username; // Store the username in the session
      console.log(`User ${username} logged in`);

      // Redirect to a dashboard or home upon successful login
      res.redirect('/'); // Change this to your actual dashboard route
    } else {
      // Invalid credentials: Redirect back to login
      res.redirect('/login'); // Change this to your login route
    }
  });
});


io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('chat message', (data) => {
    console.log('Received message: ' + data.message);
    io.emit('chat message', { message: data.message, username: data.username });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});