const fs = require('fs');
const {traitement, getUserInfo} = require('./get');
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

var clientToken;

function checkAuthentication(req,res,next){
  if(clientToken != undefined){
      next();
  } else{
      res.redirect("/auth/github");
  }
}
app.get("/auth/github", function(req, res){
  return githubOAuth.login(req, res);
});

app.get("/auth/github/callback", function(req, res){
  return githubOAuth.callback(req, res);
});

githubOAuth.on('error', function(err) {
  console.error('there was a login error', err)
})

githubOAuth.on('token', function(token, serverResponse) {
  clientToken = token.access_token;
  serverResponse.redirect("/demandeFichier");
})

app.get('/demandeFichier',checkAuthentication,function(req,res){
  var view = {
    username: "",
    email: "",
  };
  getUserInfo(clientToken).then((response) => {
    view.username = response.data.viewer.login;
    view.email = response.data.viewer.email;
    var output = Mustache.render(fs.readFileSync("./template/demandeFichier.mst", 'utf8'), view);
    res.end(output);
  }).catch(() => {
    var output = Mustache.render(fs.readFileSync("./template/demandeFichier.mst", 'utf8'), view);
    res.end(output);
  });
});

app.get('/traitementDemande',checkAuthentication,function(req,res){
  username = req.query.username
  email = req.query.email
  orga = req.query.organization
  traitement(username, email, clientToken, orga)

  res.end("ok")
});

app.get('/delete',checkAuthentication,function(req,res){
  key = req.query.key
  fs.unlink("enregistrement/"+key+"_members.json", function (err) {
    if (err) console.log(err);
  })
  fs.unlink("enregistrement/"+key+"_organization.json", function (err) {
    if (err) console.log(err);
  })
  res.end("done")
});

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});