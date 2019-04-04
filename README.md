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
    }
  }
```

If you are not using docker, you have to add a file named `.env` with the following content : 
```
db_user=my_user
db_host=my_host
db_database=my_db
db_pass=my_pass
db_port=my_port
```
If not, you can set environment variables. The variables has to be named like in the `.env` file.

# Help
## Docker
```
sudo docker-compose rm --all && sudo  docker-compose pull && sudo  docker-compose build --no-cache && sudo docker-compose up --force-recreate
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