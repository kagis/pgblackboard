import drafts_repo from '../drafts/drafts_repo.js';
export default content => dispatch => dispatch({
  type: 'DRAFTS_ADD',
  draft: drafts_repo.create(content),
});

