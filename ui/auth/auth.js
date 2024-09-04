const methods = {
  _render() {
    const { pending, error } = this.$store.auth;

    return {
      tag: 'div',
      class: 'auth',
      inner: [
        {
          tag: 'form',
          class: 'auth-form',
          onSubmit: this.on_submit,
          inner: [
            {
              tag: 'input',
              class: 'auth-user',
              type: 'text',
              name: 'user',
              placeholder: 'user',
            },

            {
              tag: 'input',
              class: 'auth-password',
              type: 'password',
              name: 'password',
              placeholder: 'password',
              autocomplete: 'current-password',
            },

            {
              tag: 'button',
              class: 'auth-submit',
              disabled: pending,
              inner: 'Login',
            },

            {
              tag: 'output',
              class: 'auth-error',
              inner: error,
            },
          ],
        },
      ],
    };
  },
  /** @param {SubmitEvent} e */
  on_submit(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    this.$store.auth_submit(form.get('user'), form.get('password'));
  },
};

export default { methods };


// const methods = {
//   _render(h) {
//     const { pending, error } = this.$store.auth;

//     return h('div', { class: 'auth' }, [
//       h('form', { class: 'auth-form', onSubmit: this.on_submit }, [
//         h('input', {
//           class: 'auth-user',
//           type: 'text',
//           name: 'user',
//           placeholder: 'user',
//         }),

//         h('input', {
//           class: 'auth-password',
//           type: 'password',
//           name: 'password',
//           placeholder: 'password',
//           autocomplete: 'current-password',
//         }),

//         h('button', {
//           class: 'auth-submit',
//           disabled: pending,
//         }, 'Login'),

//         h('output', { class: 'auth-error' }, error),
//       ]),
//     ]);
//   },
//   /** @param {SubmitEvent} e */
//   on_submit(e) {
//     e.preventDefault();
//     const form = new FormData(e.target);
//     this.$store.auth_submit(form.get('user'), form.get('password'));
//   },
// };

// export default {
//   methods,
//   render: vm => vm._render(vm.$h),
// };
