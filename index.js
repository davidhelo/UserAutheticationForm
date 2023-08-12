'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const myDB = require('./api/connection');
const session = require("express-session");
const passport = require("passport");
const routes = require('./api/routes.js');
const auth = require('./api/auth.js');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });


app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

app.use(
  session({
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: store,
    cookie: { secure: false }
}));

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

// set default engine
app.engine('pug', require('pug').renderFile);
app.set('view engine', 'pug');
app.set('views', './views/pug');

// initiailise passport and session
app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  routes(app, myDataBase);
  auth(app, myDataBase);
  
  
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { 
      title: e, 
      message: 'Unable to connect to database' 
    });
  });
});

app.use('/api/routes.js', routes);  

// app.listen...
const PORT = process.env.PORT || 5050;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
