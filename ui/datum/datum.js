export default {
  template: /*html*/ `
    <div class="datum">
      <div class="datum-tab">foo jsonb &times;</div>
      <div class="datum-value" v-text="selected_datum"></div>
    </div>
  `,
  computed: {
    selected_datum: vm => vm.$store.selected_datum,
  },
}
