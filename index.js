const envConf = require('dotenv').config()
const fs = require('fs');
const { traitement, getUserInfo } = require('./get');
const { getStats } = require('./stats');
const Mustache = require("mustache");
const uuidv1 = require('uuid/v1');

const express = require("express"),
  app = express(),
  config = require("./config.js"),
  port = 3000;

const { Client } = require('pg')
const clientdb = new Client({
  user: process.env.db_user,
  host: process.env.db_host,
  database: process.env.db_database,
  password: process.env.db_pass,
  port: process.env.db_port,
})

clientdb.connect().catch(error=>{
  console.log(error)
  process.exit(1);clientdb
});

const githubOAuth = require('github-oauth')({
  githubClient: config.GITHUB_KEY,
  githubSecret: config.GITHUB_SECRET,
  baseURL: 'http://localhost:' + port,
  loginURI: '/auth/github',
  callbackURI: '/auth/github/callback'
});

let clientToken;

function checkAuthentication(req, res, next) {
  if (clientToken != undefined) {
    next();
  } else {
    res.redirect("/auth/github");
  }
}

app.get("/auth/github", function (req, res) {
  return githubOAuth.login(req, res);
});

app.get("/auth/github/callback", function (req, res) {
  return githubOAuth.callback(req, res);
});

githubOAuth.on('error', function (err) {
  console.error('there was a login error', err);
});

githubOAuth.on('token', function (token, serverResponse) {
  clientToken = token.access_token;
  serverResponse.redirect("/demandeFichier");
});

app.get('/demandeFichier', checkAuthentication, function (req, res) {
  let view = {
    username: "",
    email: "",
  };
  return getUserInfo(clientToken).then((response) => {
    view.username = response.data.viewer.login;
    view.email = response.data.viewer.email;
    var output = Mustache.render(fs.readFileSync("./template/demandeFichier.mst", 'utf8'), view);
    res.end(output);
    return;
  }).catch(() => {
    var output = Mustache.render(fs.readFileSync("./template/demandeFichier.mst", 'utf8'), view);
    res.end(output);
    return;
  });
});

app.get('/traitementDemande', checkAuthentication, function (req, res) {
  username = req.query.username;
  email = req.query.email;
  orga = req.query.organization;
  key = req.query.key
  if (!username || !email || !orga) {
    res.status(400).end('{"error" : "username, email, orga  parameter required!"}');
    return;
  }
  if (!key) {
    key = uuidv1();
  }
  traitement(key, username, email, clientToken, orga);
  res.end("ok");
  return;
});

app.get('/delete', checkAuthentication, function (req, res) {
  key = req.query.key;
  if (!key) {
    res.status(400).end('{"error" : "Key parameter required!"}');
    return;
  }

  //TODO refaire le delete 
  res.end("done");
});

app.get('/vizu', function (req, res) {
  key = req.query.key;
  organization = req.query.organization;
  if (!key || !organization) {
    res.status(400).end('{"error" : "key or organization parameter missing!"}');
    return;
  }

  return clientdb.query(`select * from recherche where "idClient"=$1 and organization=$2 order by date;`, [key, organization])
    .then((result) => {
      let data = [];
      let allLang = [];
      result.rows.forEach((row) => {
        dataRow = getStats(row.members_json, row.organization_json, organization)
        allLang = allLang.concat(dataRow.topLanguageUser.concat(dataRow.topLanguageOrga));
        obj = {
          date: row.date,
          analyse: dataRow,
        };
        data.push(obj)
      })
      langSet = [...new Set(allLang.map(a => Object.keys(a)[0]))];
      let dataView = {
        stats: JSON.stringify(data),
        languages: langSet
      };
      let output = Mustache.render(fs.readFileSync("./template/vizu.mst", 'utf8'), dataView);
      res.status(200).end(output);
      return;
    });
})

var server = app.listen(port, function () {
  console.log('Listening on port %d', server.address().port);
});