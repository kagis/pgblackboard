define(function (require, exports, module) {
  'use strict';
  
  module.exports = reduce_edits;
  
  function reduce_edits(state, action) {
    switch (action.type) {
      case 'INIT':
      case 'TREENODE_DEFINITION_LOADED':
      case 'DRAFTS_SELECT':
      case 'EXEC':
      case 'TABLE_SAVED':
        return {};
        
      case 'TABLE_INSERT':
      case 'TABLE_INSERT_CANCEL':
      case 'TABLE_UPDATE':
      case 'TABLE_DELETE':
      case 'TABLE_SAVE_ERROR':
        return Object.assign({}, state, {
          [action.database_and_table]: reduce_edits_inner(
            state[action.database_and_table],
            action
          ),
        });
      
      default:
        return state;
    }
  }
  
  function reduce_edits_inner(
    state = {
      inserts: [],
      updates: {},
      deletes: {},
      updates_errors: {},
      inserts_errors: []
    },
    action
  ) {
    switch (action.type) {
      case 'TABLE_INSERT':
        return Object.assign({}, state, {
          inserts: Object.assign([], state.inserts, {
            [action.index]: obj_filter(
              value => value !== undefined,
              Object.assign({}, state.inserts[action.index], {
                [action.column]: action.value,
              })
            ),
          }),
        });
        
      case 'TABLE_INSERT_CANCEL':
        return Object.assign({}, state, {
          inserts: state.inserts.filter((_, i) => i != action.index),
        });
        
      case 'TABLE_UPDATE':
        return Object.assign({}, state, {
          updates: obj_filter(obj_has_keys, Object.assign({}, state.updates, {
            [action.key]: obj_filter(
              it => it !== undefined,
              Object.assign({}, state.updates[action.key], {
                [action.column]: action.value,
              })
            ),
          })),
        });
        
      case 'TABLE_DELETE':
        return Object.assign({}, state, {
          deletes: obj_filter(Boolean, Object.assign({}, state.deletes, {
            [action.key]: action.should_delete,    
          })),
        });
      
      case 'TABLE_SAVE_ERROR':
        return Object.assign({}, state, {
          updates_errors: Object.assign(state.updates_errors, {
            [action.key]: action.message,
          }),
        });
      
      default:
        return state;
    }
  }
  
  function obj_filter(fn, obj) {
    for (let key in obj) {
      if (!fn(obj[key])) {
        delete obj[key];
      }
    }
    return obj;
  }
  
  function obj_has_keys(obj) {
    for (let key in obj) {
      if (Object.hasOwnProperty.call(obj, key)) {
        return true;
      }
    }
    return false;
  } 
});