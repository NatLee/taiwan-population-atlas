import pkg from '../../package.json' with { type: 'json' };

/** Name, version and repository come from package.json, so they are written down once. */
export const PROJECT = {
  name: pkg.name,
  version: pkg.version,
  repoUrl: pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''),
};
