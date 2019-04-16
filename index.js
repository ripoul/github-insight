const envConf = require('dotenv').config()
const fs = require('fs');
const { traitement, getUserInfo } = require('./get');
const { getStats } = require('./stats');
const Mustache = require("mustache");
const uuidv1 = require('uuid/v1');
const cookieParser = require('cookie-parser');

const express = require("express"),
  app = express(),
  port = process.env.PORT || 8080;

app.use(cookieParser());

const { Client } = require('pg');
const clientdb = new Client({
  user: process.env.db_user,
  host: process.env.db_host,
  database: process.env.db_database,
  password: process.env.db_pass,
  port: process.env.db_port
})

clientdb.connect().catch(error => {
  console.log(error)
  process.exit(1); clientdb
});

const githubOAuth = require('github-oauth')({
  githubClient: process.env.GITHUB_KEY,
  githubSecret: process.env.GITHUB_SECRET,
  baseURL: process.env.adress,
  loginURI: '/auth/github',
  callbackURI: '/auth/github/callback'
});

function checkAuthentication(req, res, next) {
  if (typeof req.cookies.token !== 'undefined') {
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
  serverResponse.cookie('token', token.access_token);
  serverResponse.redirect(`/demandeFichier`);
});

app.get('/demandeFichier', checkAuthentication, function (req, res) {
  let view = {
    username: "",
    email: ""
  };
  return getUserInfo(req.cookies.token).then((response) => {
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
  traitement(key, username, email, req.cookies.token, orga);
  res.end("traitement en cours : vous receverez un mail");
  return;
});

app.get('/delete', function (req, res) {
  key = req.query.key;
  if (!key) {
    res.status(400).end('{"error" : "Key parameter required!"}');
    return;
  }
  clientdb.query(`delete from recherche where "idClient"=$1 `, [key]).then(result => {
    res.end("recherche suprimée");
  })
});

app.get('/demandeDelete', function (req, res) {
  let output = Mustache.render(fs.readFileSync("./template/demandeDelete.mst", 'utf8'));
  res.status(200).end(output);
  return;
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

app.get("/", function (req, res) {
  res.redirect("/demandeFichier");
})

var server = app.listen(port, function () {
  console.log('Listening on port %d', server.address().port);
});