const fs = require('fs');
const {traitement, getUserInfo} = require('./get');
const {getStats} = require('./stats');
const Mustache = require("mustache");

const express = require("express"),
    app = express(),
    config = require("./config.js")
    port = 3000;

const githubOAuth = require('github-oauth')({
  githubClient: config.GITHUB_KEY,
  githubSecret: config.GITHUB_SECRET,
  baseURL: 'http://localhost:' + port,
  loginURI: '/auth/github',
  callbackURI: '/auth/github/callback'
});

let clientToken;

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
  console.error('there was a login error', err);
});

githubOAuth.on('token', function(token, serverResponse) {
  clientToken = token.access_token;
  serverResponse.redirect("/demandeFichier");
});

app.get('/demandeFichier',checkAuthentication,function(req,res){
  let view = {
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
  username = req.query.username;
  email = req.query.email;
  orga = req.query.organization;
  traitement(username, email, clientToken, orga);

  res.end("ok");
});

app.get('/delete',checkAuthentication,function(req,res){
  key = req.query.key;
  if (!key) {
    res.status(400).end('{"error" : "Key parameter required!"}');
    return;
  }

  fs.unlink("enregistrement/"+key+"_members.json", function (err) {
    if (err) console.log(err);
  });
  fs.unlink("enregistrement/"+key+"_organization.json", function (err) {
    if (err) console.log(err);
  });
  res.end("done");
});

app.get('/vizu', function (req, res) {
  key = req.query.key;
  organization = req.query.organization;
  if (!key || !organization) {
    res.status(400).end('{"error" : "key or organization parameter missing!"}');
    return;
  }

  let dataView = {
    stats: JSON.stringify(getStats(key, organization))
  };

  console.log(dataView);
  let output = Mustache.render(fs.readFileSync("./template/vizu.mst", 'utf8'), dataView);
  res.status(200).end(output);
})

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});