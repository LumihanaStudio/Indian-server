module.exports = init;
function init(app) {
  var passport = require('passport');
  app.use(passport.initialize());
  app.use(passport.session());
  var FacebookStrategy = require('passport-facebook').Strategy;
  var TwitterStrategy = require('passport-twitter').Strategy;

  passport.serializeUser(function(user, done) {
   done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
   done(null, obj);
  });

  passport.use(new TwitterStrategy({
      consumerKey: "ECwpOyq7pUBZ4treyiVMonx0u",
      consumerSecret: "DU0A95yze0uQTH4KnD8Z1zimRHPwcTn6zXl4CwqbhE3HmLg2CT",
      callbackURL: "http://localhost:8000/auth/twitter/callback"
    }, function(token, tokenSecret, profile, done) {
      return done(null, profile);
    }));

 passport.use(new FacebookStrategy({
  clientID: "287298044942238",
  clientSecret: "083671e2e06bff5efdbeef9ea15c1a27",
  callbackURL: "http://localhost:8000/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'photos', 'email', 'gender']
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

app.get('/auth/twitter', passport.authenticate('twitter'));
  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
    successRedirect: '/onSuccess',
    failureRedirect: '/onFailure'
  }));

app.get('/auth/facebook', passport.authenticate('facebook'));
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    successRedirect: '/onSuccess',
    failureRedirect: '/onFailure'
  }));
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });
}
