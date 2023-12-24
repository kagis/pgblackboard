export default {
  // render: h => h('div')
  template: /*html*/ `
    <div v-on:pointerdown.left="on_pointerdown"
      v-on:lostpointercapture="on_lostpointercapture">
    </div>
  `,
  props: {
    x: { default: 0 },
    y: { default: 0 },
    origin: Object,
  },
  methods: {
    on_pointerdown({ clientX, clientY, pointerId }) {
      this.start_x = this.x - clientX;
      this.start_y = this.y - clientY;
      this._origin = this.origin && JSON.parse(JSON.stringify(this.origin));
      this.$el.setPointerCapture(pointerId);
      this.$el.addEventListener('pointermove', this.on_pointermove);
    },
    on_lostpointercapture(e) {
      this.$el.removeEventListener('pointermove', this.on_pointermove);
      // TODO fix в safari e.clientX e.clientY установлены в 0
      this.on_pointermove(e, true);

      // Eсли отпустить захваченый ресайзер так, чтобы курсор находился над кликабельным элементом
      // вне ресайзера, то кликабельный элемент кликнется. Не удобное поведение. Предотвратим.
      this.$el.ownerDocument.addEventListener('click', click_evt => click_evt.stopPropagation(), { capture: true, once: true });
    },
    on_pointermove({ clientX, clientY }, done = false) {
      // TODO fix в safari происходит выделение текста при перетаскивании grip'а
      this.$emit('drag', { done, origin: this._origin, x: clientX + this.start_x, y: clientY + this.start_y, clientX, clientY });
    },
  },
};
