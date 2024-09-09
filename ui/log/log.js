const methods = {
  _render() {
    const { messages } = this.$store.out;

    return {
      tag: 'div',
      class: 'log',
      'aria-label': 'log',
      inner: [
        {
          tag: 'p',
          class: 'log-header',
          inner: this._render_header_content(),
        },

        ...messages.map(m => ({
          tag: 'p',
          class: 'log-item',
          inner: this._render_item_content(m),
        })),
      ],
    };
  },
  _render_header_content() {
    const can_wake = this.$store.can_wake();
    const { suspended, loading, messages } = this.$store.out;
    const has_errors = messages.some(m => m.tag == 'error');

    if (suspended && suspended.reason == 'idle_in_transaction') {
      return [
        { tag: 'span', class: 'log-header_icon log-icon_suspended' },
        { tag: 'span', class: 'log-header_text', innerHTML: 'idle in transaction' },
        {
          tag: 'button',
          class: 'log-wake_commit',
          type: 'button',
          disabled: !can_wake,
          onClick: this.wake,
          innerHTML: 'Commit',
        },
      ];
    }

    if (suspended) {
      return [
        { tag: 'span', class: 'log-header_icon log-icon_suspended' },
        { tag: 'span', class: 'log-header_text', innerHTML: 'traffic limit exceeded' },
        {
          tag: 'button',
          class: 'log-wake_more',
          type: 'button',
          disabled: !can_wake,
          onClick: this.wake,
          innerHTML: 'More',
        },
      ];
    }

    if (loading) {
      return [
        { tag: 'span', class: 'log-header_icon log-icon_ellipsis' },
        { tag: 'span', class: 'log-header_text', innerHTML: 'RUNNING' },
      ];
    }

    if (has_errors) {
      return [
        { tag: 'span', class: 'log-header_icon log-icon_failed' },
        { tag: 'span', class: 'log-header_text', innerHTML: 'FAILED' },
      ];
    }

    return [
      { tag: 'span', class: 'log-header_icon log-icon_ok' },
      { tag: 'span', class: 'log-header_text', innerHTML: 'SUCCEEDED' },
    ];
  },
  _render_item_content({ tag: kind, payload }) {
    if (kind == 'complete') {
      return [
        { tag: 'span', class: 'log-marker log-icon_complete' },
        { tag: 'span', class: 'log-complete', innerText: payload },
      ];
    }

    const { severity, severityEn, code, message, detail, hint, ...fields } = payload;
    return [{
      tag: 'details',
      open: kind == 'error',
      inner: [
        {
          tag: 'summary',
          inner: [
            { tag: 'span', class: 'log-marker log-icon_ellipsis' },
            {
              tag: 'span',
              class: 'log-prefix',
              // 'data-iserror': kind == 'error' || null,
              'data-severity': severityEn,
              inner: [
                { tag: 'span', class: 'log-severity', innerText: severity },
                code && code != '00000' && { tag: 'span', class: 'log-code', innerText: ' #' + code },
                { tag: 'span', innerHTML: '. ' },
              ],
            },
            { tag: 'span', innerText: message },
          ]
        }, // summary

        detail && { tag: 'div', class: 'log-detail', innerText: detail },
        hint && { tag: 'div', class: 'log-hint', innerText: hint },
        {
          tag: 'div',
          class: 'log-fields',
          inner: Object.entries(fields).map(([k, v]) => ({
            tag: 'div',
            inner: [
              { tag: 'span', innerText: k },
              { tag: 'span', innerHTML: ':&nbsp;' },
              { tag: 'span', innerText: v },
            ],
          })),
        },
      ],
    }];
  },
  wake() {
    this.$store.wake();
  },
};

export default {
  methods,
};
