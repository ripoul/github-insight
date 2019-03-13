const fs = require('fs');
const {traitement} = require('./get');
const {getStats} = require('./stats');
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
    email:""
  };
  var output = Mustache.render(fs.readFileSync("./template/demandeFichier.mst", 'utf8'), view);
  res.end(output)
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
  if (!key) {
    res.status(400).end('{"error" : "Key parameter required!"}');
    return
  }

  fs.unlink("enregistrement/"+key+"_members.json", function (err) {
    if (err) console.log(err);
  })
  fs.unlink("enregistrement/"+key+"_organization.json", function (err) {
    if (err) console.log(err);
  })
  res.end("done")
});

app.get('/vizu', function (req, res) {
  key = req.query.key
  organization = req.query.organization
  if (!key || !organization) {
    res.status(400).end('{"error" : "key or organization parameter missing!"}');
    return
  }
  getStats(key, organization);
})

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});