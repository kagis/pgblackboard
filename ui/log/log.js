export default {
  template: /*html*/ `
    <div class="log">
      <div class="log-header">
        <template v-if="status == 'running'">
          <span class="log-status_icon"></span>
          RUNNING
        </template>
        <template v-if="status == 'succeeded'">
          <span class="log-status_icon log-status_icon_succeeded"></span>
          SUCCEEDED in <span v-text="took_msec"></span> msec
        </template>
        <template v-if="status == 'failed'">
          <span class="log-status_icon log-status_icon_failed"></span>
          FAILED
        </template>
      </div>
      <p class="log-msg" v-for="m of messages" :data-tag="m.tag">
        <template v-if="/^(CommandComplete|EmptyQueryResponse)$/.test(m.tag)">
          <span class="log-cmd" v-text="m.payload || m.tag"></span>
        </template>
        <template v-if="/^(NoticeResponse|ErrorResponse)$/.test(m.tag)">
          <span class="log-prefix">
            <span class="log-severity" v-text="m.payload.severity"></span>
            <span class="log-code"
              v-if="m.payload.code != '00000'"
              v-text="'\u00a0#' + m.payload.code">
            </span>
            <span>.</span>
          </span>
          <span>&nbsp;</span>
          <span v-text="m.payload.message"></span>
          <div class="log-detail" v-if="m.payload.detail" v-text="m.payload.detail?.slice(0, 100)"></div>
          <div class="log-hint" v-if="m.payload.hint" v-text="m.payload.hint"></div>
          <div class="log-fields">
            <div v-for="[prop, val] of get_msg_fields(m.payload)">
              <span v-text="prop"></span>:
              <span v-text="val"></span>
            </div>
          </div>
        </template>
      </p>
    </div>
  `,
  computed: {
    took_msec: vm => vm.$store.out.took_msec,
    messages: vm => vm.$store.out.messages,
    status() {
      if (this.$store.out.loading) {
        return 'running';
      }
      if (this.messages.some(m => m.tag == 'ErrorResponse')) {
        return 'failed';
      }
      return 'succeeded';
    },
  },
  // updated() {
  //   // follow
  //   this.$el.scrollTop = 1e5;
  // },
  methods: {
    get_msg_fields(msg) {
      return (
        Object.entries(msg)
        .filter(([k]) => !/^(code|severity|severityEn|message|hint|detail)$/.test(k))
      );
    },
  },
};
