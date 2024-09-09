import xGrip from '../grip/grip.js';

const methods = {
  _render() {
    const { frames, curr_frame_idx, curr_row_idx } = this.$store.out;
    const datum_focused = this.$store.datum_focused;

    return {
      tag: 'div',
      class: 'out',
      'data-datum_focused': datum_focused || null,
      inner: frames.map((frame, frame_idx) => ({
        tag: 'table',
        class: 'out-table',
        'data-frame_idx': frame_idx,
        inner: [
          {
            tag: 'colgroup',
            inner: [
              { tag: 'col', class: 'out-col_rowh' },
              ...frame.cols.map((col, col_idx) => ({
                tag: 'col',
                class: 'out-col',
                style: { width: col.width + 'px' },
                'data-selected': col_is_selected(frame_idx, col_idx) || null,
              })),
              { tag: 'col', class: 'out-col out-col_last' },
            ],
          }, // colgroup

          {
            tag: 'thead',
            class: 'out-thead',
            inner: [{
              tag: 'tr',
              inner: [
                { tag: 'th', class: 'out-th_rowh', scope: 'col', innerHTML: '#' },
                ...frame.cols.map((col, col_idx) => ({
                  tag: 'th',
                  class: 'out-th',
                  'data-key': col.att_key || null,
                  'data-selected': col_is_selected(frame_idx, col_idx) || null,
                  scope: 'col',
                  inner: [
                    // TODO support \n, leading/tailing whitespace in colname
                    { tag: 'span', class: 'out-colh_name', inner: col.name },
                    ' ',
                    { tag: 'span', class: 'out-colh_type', inner: col.type },
                    {
                      tag: xGrip,
                      class: 'out-colh_resizer',
                      x: col.width,
                      onDrag: e => this.resize_col(frame_idx, col_idx, e.x),
                    },
                  ],
                })), // th
                { tag: 'th', class: 'out-th', scope: 'col',  },
              ],
            }], // tr
          }, // thead

          {
            tag: 'tbody',
            class: 'out-tbody',
            onClick: e => this.on_tbody_click(e, frame_idx),
            onMousedown: this.on_tbody_mousedown,
            inner: [
              ...frame.rows.map((row, row_idx) => ({
                tag: 'tr',
                class: 'out-row',
                'data-will_delete': row.will_delete || null,
                'data-selected': row_is_selected(frame_idx, row_idx) || null,
                'data-row_idx': row_idx,
                inner: [
                  { tag: 'th', 'class': 'out-th_rowh', scope: 'row', innerText: row_idx + 1 },
                  ...frame.cols.map((_col, col_idx) => ({
                    tag: xTd,
                    class: 'out-cell',
                    row,
                    col_idx,
                    'data-selected': cell_is_selected(frame_idx, row_idx, col_idx) || null,
                    'data-col_idx': col_idx,
                  })), // xTd
                  {
                    tag: 'td',
                    class: 'out-td_last',
                    inner: !frame_is_updatable(frame_idx) ? [] : [
                      {
                        tag: 'button',
                        class: 'out-delete_row',
                        type: 'button',
                        disabled: row_is_dirty(row),
                        'aria-label': 'Delete row',
                        // TODO avoid event listener in row
                        onClick: e => (e.stopPropagation(), this.delete_row(frame_idx, row_idx)),
                      },
                      {
                        tag: 'button',
                        class: 'out-revert_row',
                        type: 'button',
                        disabled: !row_is_dirty(row),
                        'aria-label': 'Revert row',
                        // TODO avoid event listener in row
                        onClick: e => (e.stopPropagation(), this.revert_row(frame_idx, row_idx)),
                      },
                    ],
                  }, // td.out-td_last
                ],
              })), // tr.out-row
              frame_is_insertable(frame_idx) && {
                tag: 'tr',
                class: 'out-row out-row--new',
                'data-selected': row_is_selected(frame_idx, frame.rows.length) || null,
                'data-row_idx': frame.rows.length,
                inner: [
                  { tag: 'th', 'class': 'out-th_rowh', scope: 'row', innerHTML: '*' },
                  ...frame.cols.map((_col, col_idx) => ({
                    tag: 'td',
                    class: 'out-cell',
                    'data-selected': cell_is_selected(frame_idx, frame.rows.length, col_idx) || null,
                    'data-col_idx': col_idx,
                    innerHTML: '&mldr;',
                  })),
                  // TODO last td (delete/revert)?
                ],
              }, // tr.out-row--new
            ],
          }, // tbody
        ],
      })), // table
    };

    function col_is_selected(frame_idx, col_idx) {
      return (
        // this.datum_opened &&
        curr_frame_idx == frame_idx &&
        frames[frame_idx].curr_col_idx == col_idx
      );
    }
    function row_is_selected(frame_idx, row_idx) {
      return (
        curr_frame_idx == frame_idx &&
        curr_row_idx == row_idx
      );
    }
    function cell_is_selected(frame_idx, row_idx, col_idx) {
      return (
        row_is_selected(frame_idx, row_idx) &&
        col_is_selected(frame_idx, col_idx)
      );
    }
    function frame_is_updatable(frame_idx) {
      return frames[frame_idx].cols.some(col => col.att_key);
    }
    function frame_is_insertable(frame_idx) {
      return frames[frame_idx].cols.some(col => col.att_name);
    }
    function row_is_dirty(row) {
      return row.will_insert || row.will_delete || Boolean(row.updates.length);
    }
  },
  _mounted() {
    // TODO unlisten
    this.$root.$el.addEventListener('req_row_focus', this.on_row_navigate);
  },
  delete_row(frame_idx, row_idx) {
    this.$store.delete_row(frame_idx, row_idx);
  },
  revert_row(frame_idx, row_idx) {
    this.$store.revert_row(frame_idx, row_idx);
  },
  resize_col(frame_idx, col_idx, width) {
    this.$store.resize_col(frame_idx, col_idx, Math.max(width, 50));
  },
  on_tbody_click(/** @type {MouseEvent} */ e, frame_idx) {
    const { target } = e;
    const tr = target.closest('[data-row_idx]');
    if (!tr) return;
    const row_idx = Number(tr.dataset.row_idx);
    const col_idx = Number(target.closest('[data-col_idx]')?.dataset?.col_idx);
    this.$store.set_curr_rowcol(frame_idx, row_idx, col_idx);
    this.$root.$el.dispatchEvent(new CustomEvent('req_map_navigate', { detail: { frame_idx, row_idx, origin: 'sheet' } }));

    if (e.detail == 2 && Number.isInteger(col_idx)) {
      this.$root.$el.dispatchEvent(new CustomEvent('req_datum_focus'));
    }
  },
  on_tbody_mousedown(e) {
    if (e.detail > 1) {
      e.preventDefault();
    }
  },
  on_row_navigate({ detail: { frame_idx, row_idx } }) {
    // TODO get curr_frame_idx, curr_row_idx from store
    const tr = this.$el.querySelector(`[data-frame_idx="${frame_idx}"] tr[data-row_idx="${row_idx}"]`);
    tr.scrollIntoView({ block: 'center' });
  },
};

export default {
  methods,
};

const xTd = {
  props: {
    row: Object,
    col_idx: Number,
  },
  methods: {
    _render() {
      const actual = this.row.tuple[this.col_idx];
      const change = this.row.updates[this.col_idx];
      const display = change === undefined ? actual : change;
      const display_html = display?.replace(/(?<=^.{256}).+|[<>&\r\n]/sg, html_escape_td);

      return {
        tag: 'td',
        'data-null': display == null || null,
        'data-dirty': change !== undefined || null,
        innerHTML: display_html,
      };
    },
  },
};

function html_escape_td(x) {
  switch (x) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '\r': return /*html*/ `<em>&bsol;r</em>`;
    case '\n': return /*html*/ `<em>&bsol;n</em>`;
    default: return /*html*/ `<em>&mldr;</em>`;
  }
}
