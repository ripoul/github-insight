if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

var Mustache = require("mustache")

var express = require("express"),
    app = express(),
    config = require("./config.js")
    port = 3000;

var githubOAuth = require('github-oauth')({
  githubClient: config.GITHUB_KEY,
  githubSecret: config.GITHUB_SECRET,
  baseURL: 'http://localhost:' + port,
  loginURI: '/auth/github',
  callbackURI: '/auth/github/callback'
})

function checkAuthentication(req,res,next){
  if(localStorage.getItem("token")){
      next();
  } else{
      res.redirect("/auth/github");
  }
}

app.get("/auth/github", function(req, res){
  console.log("started oauth");
  return githubOAuth.login(req, res);
});

app.get("/auth/github/callback", function(req, res){
  console.log("received callback");
  return githubOAuth.callback(req, res);
});

githubOAuth.on('error', function(err) {
  console.error('there was a login error', err)
})

githubOAuth.on('token', function(token, serverResponse) {
  localStorage.setItem('token',token)
})

app.get('/demandeFichier',checkAuthentication,function(req,res){
  var view = {
    username: "Joe",
  };
   
  var output = Mustache.render("bonjour : {{username}}", view);
  res.end(output)
});

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});