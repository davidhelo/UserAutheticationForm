const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  };

  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'User login',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
      userAlreadyRegistered: Boolean(req.query.invalidUser)
  });
  });

  app.route('/auth/github').get(passport.authenticate('github'));

  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/' }), (req,res) => {
      req.session.user_id = req.user.id;
    res.redirect('/profile');
  });
  
  //post request to /login
  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  });
  
  app.route('/profile').get(ensureAuthenticated, (req,res) => {
      res.render('profile', {
        username: req.user.username
      });
    });
  
  app.route('/logout')
    .get((req, res) => {
      req.logout();
      res.redirect('/');
  });
  
  app.route('/register')
    .post((req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/?invalidUser=true#registrationForm');
        } else {
          myDataBase.insertOne({
            username: req.body.username,
            password: hash
          },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                next(null, doc.ops[0]);
              }
            }
          )
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );
    
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('404 Not Found');
  });
  
}
