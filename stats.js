const config = require('dotenv').config()
const chalk = require('chalk')

function getStats(members, organizationRepositories, githubOrganization) {
  const membersWithRepositories = members.filter(member => member.repositories.length > 0)
  const repositoriesOwnedByMembers = membersWithRepositories
    .map(member => {
      member.repositories = member.repositories.filter(repository => repository.owner.login === member.login)
      return member
    })
    .flatMap(member => member.repositories)

  const repositories = members
    .flatMap(member => member.repositories)
  const primaryLanguages = repositories
    .flatMap(repository => repository.primaryLanguage)
    .filter(primaryLanguage => primaryLanguage !== null)
    .flatMap(primaryLanguage => primaryLanguage.name)
    .reduce((acc, next) => {
      const index = acc.findIndex(([language]) => language === next)
      if (index === -1) {
        acc.push([next, 1])
      } else {
        const [language, count] = acc[index]
        acc[index] = [language, count + 1]
      }
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
  const stargazersForMembersOwnedRepositories = repositoriesOwnedByMembers
    .reduce((acc, next) => {
      acc.push([`${next.name} (${next.owner.login})`, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const topPrimaryLanguages = primaryLanguages.slice(0, 10)

  const topPrimaryLanguagesInOrganization = organizationRepositories
    .flatMap(repository => repository.primaryLanguage)
    .filter(primaryLanguage => primaryLanguage !== null)
    .flatMap(primaryLanguage => primaryLanguage.name)
    .reduce((acc, next) => {
      const index = acc.findIndex(([language]) => language === next)
      if (index === -1) {
        acc.push([next, 1])
      } else {
        const [language, count] = acc[index]
        acc[index] = [language, count + 1]
      }
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const stargazersForOrganization = organizationRepositories
    .reduce((acc, next) => {
      acc.push([next.name, next.stargazers.totalCount])
      return acc
    }, [])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log(chalk`
  {bold.red.bgWhite ${githubOrganization}}
  Members: {blue ${members.length}}
  With repositories: {blue ${membersWithRepositories.length}}
  Organization repositories: {blue ${organizationRepositories.length}}
  Organization top languages:\r\n{blue ${topPrimaryLanguagesInOrganization.map(([language, count]) => `\t- ${language}: ${count}`).join('\r\n')}}
  Organization top repositories:\r\n{blue ${stargazersForOrganization.map(([repo, count]) => `\t- ${repo}: ${count} ⭐️`).join('\r\n')}}
  ${githubOrganization} members repositories: {blue ${repositories.length}}
  Top languages:\r\n{blue ${topPrimaryLanguages.map(([language, count]) => `\t- ${language}: ${count}`).join('\r\n')}}
  Top ${githubOrganization} members repositories:\r\n{blue ${stargazersForMembersOwnedRepositories.map(([repo, count]) => `\t- ${repo}: ${count} ⭐️`).join('\r\n')}}
  `)

  let ret = {};
  ret.organization = githubOrganization;
  ret.nbMembers = members.length;
  ret.nbMembersWithRepo = membersWithRepositories.length;
  ret.nbOrgaRepo = organizationRepositories.length;
  ret.topLanguageOrga = topPrimaryLanguagesInOrganization.map(([language, count]) => {
    let obj = {};
    obj[language] = count;
    return obj;
  });
  ret.orgaTopRepo = stargazersForOrganization.map(([repoName, count]) => {
    let obj = {};
    obj[repoName] = count;
    return obj;
  });
  ret.NbRepoUserOrga = repositories.length;
  ret.topLanguageUser = topPrimaryLanguages.map(([language, count]) => {
    let obj = {};
    obj[language] = count;
    return obj;
  });
  
  ret.topOrgaUserRepo = stargazersForMembersOwnedRepositories.map(([repo, count]) => {
    let obj = {}
    obj[repo] = count
    return obj
  });

  ret.topOrgaRepo = stargazersForOrganization.map(([repo, count]) => {
    let obj = {}
    obj[repo] = count
    return obj
  });

  return ret;

}

module.exports.getStats = getStats;
