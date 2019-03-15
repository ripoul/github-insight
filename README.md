# Why

This repository is a try to get insights on an GitHub organization and its members.

# How

Node11 is required ! Use nvm to change node version easly. Or you can use babel.

create a config.js file like that : 
```
module.exports = {
    'GITHUB_KEY': 'your-github-key-here',
    'GITHUB_SECRET': 'your-github-secret-here',
    'email':{
      'service': 'the email service (gmail)',
      'user': 'the email/user',
      'pass': 'the password'
    },
    'db':{
      'user': 'dbuser',
      'host': 'database.server.com',
      'database': 'mydb',
      'password': 'secretpassword',
      'port': 5432
    }
  }
```

# Help
## Docker
```
docker build -t <your username>/node-github-insight .
docker run -p 49160:3000 -d <your username>/node-github-insight
```

## Gcloud
We may be use gcloud to host our appli : 
```
sudo gcloud init
sudo gcloud auth login
sudo gcloud config set project github-insights-epsi
sudo gcloud app create
sudo gcloud app deploy -v v0
```