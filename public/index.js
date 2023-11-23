
function togglePasswordVisibility(passwordFieldId, checkboxId) {
  const passwordField = document.getElementById(passwordFieldId);
  const checkbox = document.getElementById(checkboxId);

  if (passwordField.type === 'password') {
    passwordField.type = 'text';
  } else {
    passwordField.type = 'password';
  }

  // Update the checkbox label accordingly
  checkbox.checked = passwordField.type === 'text';
}

const express = require('express')//import express fw
const app = express()//spusteni expresu
const port = 80//definovani portu
const path = require('path');//pro manipulaci s cestami, ať už se jedná o absolutní cesty, relativní cesty
const bodyParser = require('body-parser');//imort bodyParseru


app.use(bodyParser.urlencoded({ extended: false }));//dekoduje data poslana pres POST
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

var mysql = require('mysql2');

const con = mysql.createConnection({
  host: '192.168.1.161', // Název nebo IP adresa serveru databáze
  user: 'vitek.hoang', // Uživatelské jméno
  password: 'BookOfDarkness', // Heslo
  database: 'vitek.hoang', // Název databáze
  port: 3001
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});




app.post('/vitek.hoang', function (request, response, next) {
  var sql = `INSERT INTO userdatabase (username, email, password) VALUES ('${request.body.username}', '${request.body.email}', '${request.body.password}')`;
      con.query(sql, (error, results, fields) => {
        if (error) {
          console.error(error);
          return;
        }
        console.log(`Uživatele byli vloženi do DB`);
      })
      response.send(`Uživatele byli vloženi do DB`)
     
    });

    app.get('/formular', (req, res) => {
      res.render('formular'); // Assuming formular.ejs is directly in the 'views' directory
    });
    
    app.get('/login', (req, res) => {
      res.render('/public/login.html');
    });
    
app.listen(port, () => {//spustni serveru
  console.log(`Example app listening on port ${port}`)
})