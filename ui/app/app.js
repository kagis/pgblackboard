import xAuth from '../auth/auth.js';
import xMap from '../map/map.js';
import xCode from '../code/code.js';
import xOut from '../out/out.js';
// import xTable from '../table/table.js';
import xDrafts from '../drafts/drafts.js';
import xTree from '../tree/tree.js';
import xDatum from '../datum/datum.js';
import xLog from '../log/log.js';
import xGrip from '../grip/grip.js';

const methods = {
  _render() {
    if (!this.$store.auth.ok) {
      return {
        tag: 'div',
        class: 'app',
        inner: [{
          tag: xAuth,
          class: 'app-auth',
        }],
      };
    }

    const { light_theme, panes } = this.$store;
    const code_selected = this.$store.curr_draft?.cursor_len;
    const can_run = this.$store.can_run();
    const can_abort = this.$store.can_abort();
    const changes_num = this.$store.get_changes_num(); // TODO cache

    return {
      tag: 'div',
      class: ['app', light_theme && 'light'],
      style: {
        '--app-pane_left': panes.left,
        '--app-pane_right': panes.right,
        '--app-pane_out': panes.out,
        '--app-pane_map': panes.map,
      },
      inner: [
        {
          tag: 'div',
          class: 'app-nav_bar',
          inner: [
            {
              tag: 'button',
              class: 'app-theme_btn',
              type: 'button',
              'aria-label': 'theme',
              onClick: this.toggle_theme,
            },
          ],
        },

        {
          tag: 'div',
          class: 'app-code_bar',
          inner: [
            {
              tag: 'button',
              class: 'app-run',
              type: 'button',
              'aria-label': 'run',
              disabled: !can_run,
              'data-has_selection': !!code_selected || null,
              onClick: this.run,
            },
            {
              tag: 'button',
              class: 'app-abort',
              type: 'button',
              'aria-label': 'abort',
              disabled: !can_abort,
              onClick: this.abort,
            },
            !!changes_num && {
              tag: 'button',
              class: 'app-dump_changes_btn',
              type: 'button',
              onClick: this.dump_changes,
              inner: [
                {  tag: 'span', inner: changes_num },
                ' dirty rows',
              ],
            },
          ],
        },

        {
          tag: 'div',
          class: 'app-nav',
          inner: [
            { tag: xDrafts, class: 'app-drafts' },
            { tag: xTree, class: 'app-tree' },
          ],
        },

        { tag: xCode, class: 'app-code' },

        {
          tag: 'div',
          class: 'app-out',
          inner: [
            { tag: xOut, class: 'app-tables' },
            { tag: xLog, class: 'app-log' },
          ],
        },

        { tag: xDatum, class: 'app-datum' },
        { tag: xMap, class: 'app-map' },

        { tag: xGrip, class: 'app-split_left', origin: panes, onDrag: this.resize_left },
        { tag: xGrip, class: 'app-split_right', origin: panes, onDrag: this.resize_right },
        { tag: xGrip, class: 'app-split_out', origin: panes, onDrag: this.resize_out },
        { tag: xGrip, class: 'app-split_map', origin: panes, onDrag: this.resize_map },

        {
          tag: 'div',
          class: 'app-measure',
          ref: 'measure',
          'aria-hidden': 'true',
        },
      ],
    };
  },

  /** @param {MouseEvent} e */
  run(e) {
    // TODO show confirm dialog if .out has unsaved edits
    this.$store.run({ rw: e.altKey });
  },
  abort() {
    this.$store.abort();
  },
  toggle_theme() {
    this.$store.toggle_theme();
  },
  dump_changes() {
    this.$store.dump_changes();
  },
  resize_left({ x, origin }) {
    const wmax = this.$refs.measure.clientWidth;
    const val = origin.left + x / wmax;
    const left = Math.min(Math.max(val, 0), 1);
    const right = Math.min(origin.right, 1 - left);
    this.$store.resize_panes({ left, right });
  },
  resize_right({ x, origin }) {
    const wmax = this.$refs.measure.clientWidth;
    const val = origin.right - x / wmax;
    const right = Math.min(Math.max(val, 0), 1);
    const left = Math.min(origin.left, 1 - right);
    this.$store.resize_panes({ left, right });
  },
  resize_out({ y, origin }) {
    const hmax = this.$refs.measure.clientHeight;
    const val = origin.out + y / hmax;
    const out = Math.min(Math.max(val, 0), 1);
    const map = Math.min(origin.map, 1 - out);
    this.$store.resize_panes({ out, map });
  },
  resize_map({ y, origin }) {
    const hmax = this.$refs.measure.clientHeight;
    const val = origin.map - y / hmax;
    const map = Math.min(Math.max(val, 0), 1);
    const out = Math.min(origin.out, 1 - map);
    this.$store.resize_panes({ out, map });
  },
};

export default {
  methods,
};
