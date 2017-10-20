import drafts_repo from '../drafts/drafts_repo.js';
export default (id, content) => (dispatch) => {
  drafts_repo.update(id, content);
  dispatch({
    type: 'DRAFTS_UPDATE',
    draft: { id, content },
  });
};
