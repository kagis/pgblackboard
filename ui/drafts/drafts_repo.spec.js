import drafts_repo from './drafts_repo.js';
const DraftsRepo = drafts_repo.constructor;
console.log('spec')
describe('drafts_repo', () => {
  it('should store', () => {
    const repo = new DraftsRepo(new StorageStub());
    const { id } = repo.create('hello');
    expect(repo.get_all()).to.eql({ [id]: { id, content: 'hello' } });
  });

  it('should restore', () => {
    const storage = new StorageStub();
    const repo1 = new DraftsRepo(storage);
    const { id } = repo1.create('hello');
    const repo2 = new DraftsRepo(storage);
    expect(repo2.get_all()).to.eql({ [id]: { id, content: 'hello' } });
  });
});


class StorageStub {
  constructor() {
    this._dict = {}
  }
  get length() {
    return Object.keys(this._dict).length
  }
  key(i) {
    return Object.keys(this._dict)[i]
  }
  getItem(key) {
    return this._dict[key]
  }
  setItem(key, value) {
    this._dict[key] = value
  }
  removeItem(key) {
    delete this._dict[key]
  }
}
