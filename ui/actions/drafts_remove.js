import drafts_repo from '../drafts/drafts_repo.js';
export default id => dispatch => {
  drafts_repo.remove(id)
  dispatch({
    type: 'DRAFTS_REMOVE',
    draftId: id,
  })
};
