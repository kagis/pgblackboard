export default {
  template: /*html*/ `
    <div class="login">
      <form class="login-form" v-on:submit.prevent="submit">
        <input class="login-user"
          type="text"
          name="user"
          placeholder="user" />

        <input class="login-password"
          type="password"
          name="password"
          placeholder="password"
          autocomplete="current-password" />

        <button class="login-submit"
          :disabled="login_pending"
          :data-pending="login_pending || null">
          login
        </button>

        <output class="login-error"
          v-text="login_error">
        </output>
      </form>
    </div>
  `,
  computed: {
    // login_disabled: vm => vm.$store.login_pending,
    login_pending: vm => vm.$store.login_pending,
    login_error: vm => vm.$store.login_error,
  },
  methods: {
    submit({ target }) {
      const form = new FormData(target);
      this.$store.login(form.get('user'), form.get('password'));
    },
  },
};
