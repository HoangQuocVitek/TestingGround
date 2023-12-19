const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cookieParser = require('cookie-parser');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
const crypto = require('crypto');
// Middleware setup
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'tajnasekret',
  resave: false,
  saveUninitialized: true,
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// MySQL connection
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'BookOfDarkness',
  database: 'vitek.hoang',
  port: 3306
});
con.connect(function(err) {
  if (err) throw err;
  console.log('Connected to MySQL!');
});

// Registration endpoint
app.post('/vitek.hoang', function (request, response, next) {
  const { username, email, password, confirmPassword } = request.body;
  const userIP = request.connection.remoteAddress;

  if (password !== confirmPassword) {
    return response.status(400).send('Passwords do not match');
  }

  const sql = `INSERT INTO userdatabase (username, email, password, ip_address) VALUES (?, ?, ?, ?)`;
  con.query(sql, [username, email, password, userIP], (error, results, fields) => {
    if (error) {
      console.error(error);
      return response.status(500).send('Error inserting into the database');
    }
    console.log('User inserted into the database');
    response.redirect('/login');
  });
});

// Registration page route
app.get('/registrace', (req, res) => {
  res.render('registrace');
});

// Login page route
app.get('/login', (req, res) => {
  const username = req.session.username || '';
  res.render('login', { username });
});

// Public route
app.get('/public', (req, res) => {
  const username = req.session.username || '';
  const isLoggedIn = username !== '';

  if (isLoggedIn) {
    // Emit the presence message only when the user first connects
    if (!connectedUsers[username]) {
      io.emit('user presence', username + ' is in public');
      connectedUsers[username] = true; // Mark the user as connected
      console.log(username + ' is in public'); // Log in the server console
    }
  }

  res.render('public', { username, isLoggedIn });
});

// Root route
app.get('/', (req, res) => {
  const username = req.session.username || '';
  const isLoggedIn = username !== '';
  res.render('index', { username, isLoggedIn });
});

// Login endpoint

const randomBytes = crypto.randomBytes;
const createHash = crypto.createHash;

// Login endpoint
// Function to generate a secure random token
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Login endpoint
// Login endpoint
// Login endpoint
// Login endpoint
app.post('/login', (req, res) => {
  const { username, password, remember } = req.body;

  const sql = `SELECT * FROM userdatabase WHERE username = ? AND password = ?`;
  con.query(sql, [username, password], (error, results, fields) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error while authenticating');
    }

    if (results.length > 0) {
      const userId = results[0].idUserDatabase; // Fetch the user ID


      
      req.session.authenticated = true;
      req.session.username = username;
      console.log(`User ${username} logged in`);

      if (remember) {
        const series = generateRandomToken();
        const token = generateRandomToken();

        // Hash the token before storing it in the database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Store the series, hashed token, and user ID in the database
        const rememberMeQuery = `
          INSERT INTO remember_me (id_user_database, series, token)
          SELECT idUserDatabase, ?, ? FROM userdatabase WHERE username = ?`;
        con.query(rememberMeQuery, [series, hashedToken, username], (error, results, fields) => {
          if (error) {
            console.error(error);
            return res.status(500).send('Error storing remember me token');
          }
          console.log('Remember me token stored for user:', username);
        });

        // Set the remember me cookie with the series and token (hashed)
        res.cookie('rememberedSeries', series, { maxAge: 604800000, httpOnly: true });
        res.cookie('rememberedToken', token, { maxAge: 604800000, httpOnly: true });
      }

      io.emit('user connected', username);
      res.cookie('loggedInUser', username, { maxAge: 900000, httpOnly: true });
      res.redirect('/');
    } else {
      res.redirect('/login');
    }
  });
});




// Middleware to check remember me cookie and authenticate
app.use((req, res, next) => {
  const rememberedSeries = req.cookies.rememberedSeries;
  const rememberedToken = req.cookies.rememberedToken;

  if (rememberedSeries && rememberedToken && !req.session.username) {
    // Check if the series and token match the stored values in the database
    const checkQuery = `SELECT * FROM remember_me WHERE series = ?`;
    con.query(checkQuery, [rememberedSeries], (error, results, fields) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Error checking remember me token');
      }

      if (results.length > 0) {
        const storedToken = results[0].token;
        const hashedToken = crypto.createHash('sha256').update(rememberedToken).digest('hex');

        if (storedToken === hashedToken) {
          // If tokens match, authenticate the user
          req.session.authenticated = true;
          req.session.username = results[0].username;
          console.log(`User ${results[0].username} authenticated from remember me`);
        } else {
          // If tokens don't match, clear the remember me cookies
          res.clearCookie('rememberedSeries');
          res.clearCookie('rememberedToken');
          console.log('Remember me tokens do not match. Cookies cleared.');
        }
      }
      next();
    });
  } else {
    next();
  }
});


// Socket.io handling
const connectedUsers = {};
io.on('connection', (socket) => {
  let refreshing = false; // Flag to track refreshing
  socket.emit('page refresh');
  socket.on('user connected', (userId) => {
    connectedUsers[userId] = true;
    console.log('User connected:', userId);
  });

  socket.on('chat message', (data) => {
    const { message, username } = data;
    const timestamp = new Date();
  
    const sql = `
      INSERT INTO public_messages (id_username, message, timestamp) 
      SELECT userdatabase.idUserDatabase, ?, ? 
      FROM userdatabase 
      WHERE userdatabase.username = ?`;
  
    con.query(sql, [message, timestamp, username], (error, results, fields) => {
      if (error) {
        console.error(error);
        return;
      }
      console.log('Message inserted into the database');
      io.emit('chat message', { username, message, timestamp });
    });
  });


  socket.on('disconnect', () => {
    if (!refreshing) {
      const disconnectedUserId = socket.userId;

      if (disconnectedUserId && connectedUsers[disconnectedUserId]) {
        delete connectedUsers[disconnectedUserId];
        console.log('User disconnected:', disconnectedUserId);
      } else {
        console.log('A user disconnected');
      }
    }
  });

  // Event to handle refreshing from the client-side
  socket.on('page refresh', () => {
    refreshing = true;
    setTimeout(() => {
      refreshing = true;
    }, 1000); // Adjust the delay according to your needs
  });


});












// Retrieving messages from the database
app.get('/get-messages', (req, res) => {
  const loggedInUsername = req.session.username;

  const sql = `
    SELECT u.username AS username, pm.message AS message, pm.timestamp AS timestamp 
    FROM public_messages pm
    JOIN userdatabase u ON pm.id_username = u.idUserDatabase
    ORDER BY pm.timestamp`;

  con.query(sql, (error, results, fields) => {
    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Error fetching messages from the database' });
    }

    const formattedResults = results.map(msg => {
      const rawTimestamp = msg.timestamp;
      const formattedDate = new Date(rawTimestamp);
      const day = formattedDate.getDate();
      const month = formattedDate.getMonth() + 1;
      const hour = formattedDate.getHours();
      const minutes = formattedDate.getMinutes();
      const formattedTimestamp = `${day}/${month} ${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return { ...msg, formattedTimestamp };
    });

    res.json(formattedResults);
  });
});

// Automatic login middleware
app.use((req, res, next) => {
  const rememberedUser = req.cookies.rememberedUser;
  if (rememberedUser && !req.session.username) {
    req.session.username = rememberedUser;
  }
  next();
});

// Server listen
const port = 80;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



app.post('/create-chat', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).send('Chat name is required');
  }

  const sql = `
    CREATE TABLE IF NOT EXISTS ${name} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message TEXT,
      sender VARCHAR(255),
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  con.query(sql, (error, results, fields) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Error creating chat');
    }
    console.log('Chat table created');
    res.sendStatus(200); // Send success status if table creation is successful
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error logging out');
    }
    res.clearCookie('rememberedSeries');
    res.clearCookie('rememberedToken');
    res.clearCookie('loggedInUser');
    res.redirect('/'); 
  });
});