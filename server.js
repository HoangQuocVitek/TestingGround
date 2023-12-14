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
app.get('/public', (req, res) => {
  const username = req.session.username || '';

  const isLoggedIn = username !== '';

  res.render('public', { username, isLoggedIn });
});



app.get('/', (req, res) => {
  const username = req.session.username || '';

  const isLoggedIn = username !== '';

  res.render('index', { username, isLoggedIn });
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
    const { message, username, timestamp } = data;
  
    const formattedDate = new Date(timestamp).toLocaleString(); // Convert timestamp to user's local time
  
    const chatMessage = `
      <div>
        <span style="font-weight: bold;">${username}</span> ${formattedDate}
      </div>
      <div>${message}</div>
    `;
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/').replace(' ', ' ');

    // Your database query to insert the message into 'chat_messages' table
    const sql = `INSERT INTO chat_messages (username, message, timestamp) VALUES (?, ?, ?)`;
    con.query(sql, [username, message, currentDate], (error, results, fields) => {
        if (error) {
            console.error(error);
            // Handle the error appropriately
            return;
        }
        console.log('Message inserted into the database');
        // Emit the message to all clients
        io.emit('chat message', { username, message, timestamp: currentDate });
    });
});




  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.get('/get-messages', (req, res) => {
  // Fetch messages from 'chat_messages' table
  const sql = `SELECT username, message, timestamp FROM chat_messages ORDER BY timestamp`;
  con.query(sql, (error, results, fields) => {
    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Error fetching messages from the database' });
    }
    res.json(results); // Send fetched messages as JSON response
  });
});


