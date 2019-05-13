const envConf = require('dotenv').config()
const httpie = require('httpie');
const { default: ApolloClient, gql } = require('apollo-boost');
const ProgressBar = require('progress');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_SENDER = process.env.SENDGRID_SENDER;
const Sendgrid = require('sendgrid')(SENDGRID_API_KEY);

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
  process.exit(1);
});

function getUserInfo(githubToken) {
  return new Promise((resolve, reject) => {
    const client = new ApolloClient({
      uri: 'https://api.github.com/graphql',
      fetch: async (uri, options) => {
        const { method } = options
        options.family = 4
        options.headers = {
          ...options.headers,
          'User-Agent': "github-insight"
        }
        const res = await httpie.send(method, uri, options)
        return {
          text: async () => JSON.stringify(res.data),
          json: async () => res.data,
        }
      },
      request: operation => {
        operation.setContext({
          headers: {
            authorization: `Bearer ${githubToken}`,
          },
        });
      },
    });

    const GET_USER = gql`
    {
      viewer {
        login
        email
      }
    }
    `;

    client.query({
      query: GET_USER,
    })
      .then(resolve).catch((error) => {
        console.log(error);
      });
  })
}

async function traitement(key, githubId, email, githubToken, githubOrganization) {
  function sendMailWhenFinish(emailDemande) {
    let urlVizu = `${process.env.adress}/vizu?key=${key}&organization=${githubOrganization}`;
    console.log(`URL de visionnage : ${urlVizu}`);

    const sgReq = Sendgrid.emptyRequest({
      method: 'POST',
      path: '/v3/mail/send',
      body: {
        personalizations: [
          {
            to: [{ email: emailDemande }],
            subject: 'github insight demande fini',
          },
        ],
        from: { email: SENDGRID_SENDER },
        content: [
          {
            type: 'text/plain',
            value: `demande completé ! Vous pouvez voir le resultat à cette adresse : ${urlVizu}
            Si vous voulez completer la recherche, dans la case clé, merci de mettre "${key}"`,
          },
        ],
      },
    });

    Sendgrid.API(sgReq, err => {
      console.log(err)
    });
  }

  const client = new ApolloClient({
    uri: `https://api.github.com/graphql?access_token=${githubToken}`,
    fetch: async (uri, options) => {
      const { method } = options;
      options.family = 4;
      options.headers = {
        ...options.headers,
        'User-Agent': githubId
      };
      const res = await httpie.send(method, uri, options);
      return {
        text: async () => JSON.stringify(res.data),
        json: async () => res.data,
      };
    },
  });

  let members;
  try {
    members = await getMembers();
  } catch (e) {
    console.error('Error while fetching members', JSON.stringify(e, undefined, 2));
    process.exit(1);
  }
  console.log(`Number of members: ${members.length}`);
  const membersInError = [];
  const getOrganizationRepositories = makeGetRepositories('organization');
  const getMemberRepositories = makeGetRepositories('user');

  const bar = new ProgressBar('downloading [:bar] :login (:percent)', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: members.length
  });

  for (member of members) {
    await sleep(25);
    try {
      bar.tick({ login: member.login });
      member.repositories = await getMemberRepositories(member.login);
    } catch (e) {
      console.log('Error while fetching repositories', e);
      member.repositories = [];
      membersInError.push(member.login);
    }

    for (repository of member.repositories) {
      await sleep(25);
      try {
        repository.contributors = await getRepositoryContributors(repository.owner.login, repository.name);
      } catch (e) {
        console.log('member', member);
        console.log('repository', repository);
        console.log('Error while fetching contributors', e);
        repository.contributors = [];
      }
    }
  }

  const organization = await getOrganizationRepositories(githubOrganization);

  clientdb.query(`INSERT INTO public.recherche(
    "idClient", organization, date, members_json, organization_json)
    VALUES ($1, $2, current_date, $3, $4)
    ON CONFLICT ("idClient", organization, date)
    DO
    UPDATE
      SET "members_json" = EXCLUDED."members_json",
      "organization_json" = EXCLUDED."organization_json";`, [key, githubOrganization, JSON.stringify(members), JSON.stringify(organization)], (err, res) => {
      clientdb.end()
    })

  console.log('Members in error', JSON.stringify(membersInError, undefined, 2));

  sendMailWhenFinish(email);

  async function getRateLimit() {
    const response = await client
      .query({
        query: gql`
          {
            rateLimit {
              limit
              cost
              resetAt
              remaining
              nodeCount
            }
          }
        `
      });
    return response.data.rateLimit;
  }

  async function getRepositoryContributors(owner, repository) {
    try {
      const res = await httpie.send(
        'GET',
        `https://api.github.com/repos/${owner}/${repository}/stats/contributors?access_token=${githubToken}`,
        { headers: { 'User-Agent': githubId } }
      );
      return res.data;
    } catch (e) {
      console.log(e);
      process.exit(0);
    }
  }

  function makeGetRepositories(field) {
    return async function (login) {
      let result = []
      let repositoriesEdges = []

      do {
        const repositoriesCursor = repositoriesEdges.length ? repositoriesEdges[repositoriesEdges.length - 1].cursor : '';

        await sleep(100);
        const response = await client
          .query({
            query: gql`
              {
                ${field}(login: "${login}") {
                  repositories(first: 100${repositoriesCursor !== '' ? `, after: "${repositoriesCursor}"` : ''}, isFork: false, isLocked: false) {
                    edges {
                      node {
                        name
                        description
                        url
                        primaryLanguage {
                          name
                        }
                        stargazers {
                          totalCount
                        }
                        owner {
                          login
                        }
                      }
                      cursor
                    }
                  }
                }
              }
            `
          }).catch((error) => {
            console.log(error)
          });

        repositoriesEdges = response.data[field].repositories.edges
        if (repositoriesEdges.length) {
          const currentBatch = repositoriesEdges.map(edge => edge.node)
          result = [...result, ...currentBatch]
        }
      } while (repositoriesEdges.length > 0);
      console.log("fin async func")
      return result;
    };
  }

  async function getMembers() {
    let result = [];
    let membersEdges = [];

    do {
      const membersCursor = membersEdges.length ? membersEdges[membersEdges.length - 1].cursor : '';
      await sleep(25);
      const response = await client
        .query({
          query: gql`
            {
              organization(login: "${githubOrganization}") {
                membersWithRole(first: 100${membersCursor !== '' ? `, after: "${membersCursor}"` : ''}) {
                  edges {
                    node {
                      login
                      name
                    }
                    cursor
                  }
                }
              }
            }
          `
        });

      membersEdges = response.data.organization.membersWithRole.edges;
      if (membersEdges.length) {
        const currentBatch = membersEdges.map(edge => edge.node);
        result = [...result, ...currentBatch];
      }
    } while (membersEdges.length > 0);

    return result;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.traitement = traitement;
module.exports.getUserInfo = getUserInfo;