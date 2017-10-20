import drafts_repo from '../drafts/drafts_repo.js';

export default () => ({
  type: 'DRAFTS_LOAD',
  drafts: drafts_repo.get_all(),
});

