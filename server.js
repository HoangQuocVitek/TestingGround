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
const MySQLStore = require('express-mysql-session')(session);
const compression = require('compression');
const helmet = require('helmet');

// MySQL connection configuration
const sessionStoreOptions = {
  host: '192.168.1.161',
  port: '3001',
  user: 'vitek.hoang',
  password: 'BookOfDarkness',
  database: 'vitek.hoang',
};




app.use(cookieParser());
app.use(express.static(__dirname + '/public'));

const sessionStore = new MySQLStore(sessionStoreOptions);
app.use(session({
  secret: 'tajnasekret',
  resave: false,
  saveUninitialized: true,
  store: sessionStore, // Use the created session store
}));



app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

// MySQL connection
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
    console.log('New user has registered');
    response.redirect('/login');
  });
});

// Registration page route
app.get('/registrace', (req, res) => {
  res.render('registrace');
});


// Public route
app.get('/public', (req, res) => {
  const username = req.session.username || '';
  const isLoggedIn = username !== '';

  res.render('public', { username, isLoggedIn });
});







// Root route
app.get('/', (req, res) => {
  const username = req.session.username || '';
  const isLoggedIn = username !== '';
  res.render('indexpass', { username, isLoggedIn });
});

// Login endpoint

const randomBytes = crypto.randomBytes;
const createHash = crypto.createHash;

// Login endpoint
// Function to generate a secure random token
const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

app.post('/', (req, res) => {
  const { username, password, remember } = req.body;

  const sql = `SELECT * FROM userdatabase WHERE username = ? AND BINARY password = ?`;
  con.query(sql, [username, password], (error, results, fields) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Error while authenticating' });
    }

    if (results.length > 0) {
      // Authentication successful
      req.session.authenticated = true;
      req.session.username = results[0].username;
      console.log(`User ${results[0].username} authenticated from remember me`);

      if (remember)  {
        const series = generateRandomToken();
        const token = generateRandomToken();
        // Hash the token before storing it in the database
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        // Store the series, hashed token, and user ID in the database
        const rememberMeQuery = `
        INSERT INTO remember_me_tokens (id, user_id, series, token,created_at)
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
      res.cookie('loggedInUser', username, { maxAge: 900000, httpOnly: true });
      return res.json({ success: true });
    } else {
      // Authentication failed, return error message
      return res.json({ success: false, message: 'Wrong username or password. Please try again.' });
    }
  });
});


// Middleware to check remember me token against the database
app.use((req, res, next) => {
  const sessionCookie = req.cookies['connect.sid'];
  const rememberedSeries = req.cookies.rememberedSeries;
  const rememberedToken = req.cookies.rememberedToken;

  if (rememberedSeries && rememberedToken && !req.session.username) {
    const checkQuery = `SELECT * FROM remember_me_tokens WHERE series = ?`;
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
          req.session.username = getUsernameFromUserId(results[0].user_id);
          console.log(`User ${results[0].username} authenticated from remember me`);
        } else {
          // If tokens don't match, clear the remember me cookies
          res.clearCookie('rememberedSeries');
          res.clearCookie('rememberedToken');
          console.log('Remember me tokens do not match. Cookies cleared.');
        }
      }
      if (results.length > 0) {
        const userId = results[0].idUserDatabase; // Fetch the user ID

        // Use getUsernameFromUserId function here
        getUsernameFromUserId(userId)
          .then((username) => {
            req.session.authenticated = true;
            req.session.username = username;
            console.log(`User ${username} authenticated from remember me`);
            // Rest of your code logic here
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error getting username from user ID');
          });
      }
    }); // <--- Closing bracket for con.query block was missing
  } else {
    next();
  }
});

const getUsernameFromUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT u.username 
      FROM userdatabase u
      WHERE u.idUserDatabase = ?`;

    con.query(sql, [userId], (error, results, fields) => {
      if (error) {
        reject(error);
      } else {
        if (results.length > 0) {
          resolve(results[0].username);
        } else {
          reject(new Error('User not found'));
        }
      }
    });
  });
};

function isBase64Image(str) {
  // Regular expression to check if the string is in a base64 format for an image
  return /^data:image\/.*;base64,/.test(str);
}

const connectedUsers = {};
io.on('connection', (socket) => {
  socket.on('chat message', (data) => {
    const { message, username } = data;
    const timestamp = new Date();

    const isBase64 = isBase64Image(message);
    const isBase64InDB = isBase64 ? 1 : 0;

    const sql = `
      INSERT INTO public_messages (id_username, message, timestamp, isBase64Image) 
      SELECT userdatabase.idUserDatabase, ?, ?, ?
      FROM userdatabase 
      WHERE userdatabase.username = ?`;

    con.query(sql, [message, timestamp, isBase64InDB, username], (error, results, fields) => {
      if (error) {
        console.error(error);
        return;
      }

      // Emit the message to the clients
      if (isBase64) {
        // If it's an image, emit an <img> tag
        const imgTag = `<img src="${message}" />`;
        io.emit('chat message', { username, message: imgTag, timestamp, isBase64 });
        console.log(`${username}: Image`); // Log "Username: Image" in the console for image messages
      } else {
        // If it's not an image, emit the message as text
        io.emit('chat message', { username, message, timestamp, isBase64 });
        console.log(`${username}: ${message}`); // Log "Username: Message" in the console for text messages
      }
    });
  });
});




// Retrieving messages from the database
// Database query for retrieving messages
app.get('/get-messages', (req, res) => {
  const sql = `
    SELECT u.username AS username, pm.message AS message, pm.timestamp AS timestamp, pm.isBase64Image AS isBase64Image
    FROM public_messages pm
    JOIN userdatabase u ON pm.id_username = u.idUserDatabase
    ORDER BY pm.timestamp DESC
    LIMIT 100`; // Limit the number of messages fetched

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

      if (msg.isBase64Image === 1) {
        const imgTag = `<img src="${msg.message}" />`;
        return { ...msg, message: imgTag, formattedTimestamp, isBase64Image: 1 };
      } else {
        return { ...msg, formattedTimestamp };
      }
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

app.post('/logout', (req, res) => {
  if (req.session && req.session.username) {
    // Emit user left event to notify everyone in the chat
    io.emit('user left', req.session.username);
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error logging out');
    }

    // Clear cookies
    res.clearCookie('rememberedSeries');
    res.clearCookie('rememberedToken');
    res.clearCookie('loggedInUser');

    // Redirect to home page after logout
    res.redirect('/'); // Redirect to '/'
  });
});


app.use(compression()); // Enable gzip compression
app.use(helmet()); // Secure HTTP headers

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static files for 1 day
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));