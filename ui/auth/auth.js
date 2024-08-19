export default {
  template: /*html*/ `
    <div class="auth">
      <form class="auth-form" v-on:submit.prevent="submit">
        <input class="auth-user"
          type="text"
          name="user"
          placeholder="user" />

        <input class="auth-password"
          type="password"
          name="password"
          placeholder="password"
          autocomplete="current-password" />

        <button class="auth-submit"
          :disabled="login_pending"
          :data-pending="login_pending || null">
          login
        </button>

        <output class="auth-error"
          v-text="login_error">
        </output>
      </form>
    </div>
  `,
  computed: {
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
