export default {
  template: /*html*/ `
    <div class="log">
      <p class="log-header">
        <template v-if="status == 'running'">
          <span class="log-status_icon"></span>
          <span class="log-status_text">RUNNING</span>
        </template>
        <template v-else-if="status == 'suspended/traffic_limit_exceeded'">
          <span class="log-status_icon log-status_icon_suspended"></span>
          <span class="log-status_text">traffic limit exceeded</span>
          <button class="log-wake_more"
            :disabled="!can_wake"
            v-on:click="wake">
            more
          </button>
        </template>
        <template v-else-if="status == 'suspended/idle_in_transaction'">
          <span class="log-status_icon log-status_icon_suspended"></span>
          <span class="log-status_text">idle in transaction</span>
          <button class="log-wake_commit"
            :disabled="!can_wake"
            v-on:click="wake">
            commit
          </button>
        </template>
        <template v-else-if="status == 'succeeded'">
          <span class="log-status_icon log-status_icon_ok"></span>
          <span class="log-status_text">SUCCEEDED in <span v-text="took_msec"></span> msec</span>
        </template>
        <template v-else-if="status == 'failed'">
          <span class="log-status_icon log-status_icon_failed"></span>
          <span class="log-status_text">FAILED</span>
        </template>
      </p>
      <p class="log-msg" v-for="m of messages" :data-tag="m.tag">
        <template v-if="/^(CommandComplete|EmptyQueryResponse)$/.test(m.tag)">
          <span class="log-cmd" v-text="m.payload || m.tag"></span>
        </template>
        <details v-else-if="/^(NoticeResponse|ErrorResponse)$/.test(m.tag)"
          :open="m.tag == 'ErrorResponse'">
          <summary>
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
          </summary>
          <div class="log-detail" v-if="m.payload.detail" v-text="m.payload.detail"></div>
          <div class="log-hint" v-if="m.payload.hint" v-text="m.payload.hint"></div>
          <div class="log-fields">
            <div v-for="[prop, val] of get_msg_fields(m.payload)">
              <span v-text="prop"></span>:
              <span v-text="val"></span>
            </div>
          </div>
        </details>
      </p>
    </div>
  `,
  computed: {
    took_msec: vm => vm.$store.out.took_msec,
    messages: vm => vm.$store.out.messages,
    status() {
      if (this.$store.out.suspended) {
        return 'suspended/' + this.$store.out.suspended.reason;
      }
      if (this.$store.out.loading) {
        return 'running';
      }
      if (this.messages.some(m => m.tag == 'ErrorResponse')) {
        return 'failed';
      }
      return 'succeeded';
    },
    wake: vm => vm.$store.wake.bind(vm.$store),
    can_wake: vm => vm.$store.can_wake(),
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
