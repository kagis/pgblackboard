export default {
  name: 'x-tree',
  template: /*html*/ `
    <div class="tree"
      :style="{ '--tree-level': path.length + 1 }">
      <div class="tree-container"
        :data-type="node.type"
        v-for="node, node_idx in nodes || root_nodes">
        <div class="tree-node"
          :data-selected="node_is_selected(node_idx) || null"
          :data-type="node.type"
          :data-expanding="!!node.children?.loading || null"
          :data-expanded="!!node.children?.value || null"
          v-on:click="select(node_idx)">
          <span class="tree-marker" :data-type="node.type"></span>
          <span class="tree-caption" v-text="node.name"></span>
          <span>&nbsp;</span>
          <span class="tree-comment" v-text="node.comment"></span>
          <button class="tree-toggler"
            type="button"
            v-if="node.expandable"
            v-on:click.stop="toggle(node_idx)">
          </button>
          <!-- load indicator -->
          <span class="tree-loader"></span>
        </div>
        <x-tree class="tree-children"
          v-if="node.children?.value"
          :nodes="node.children.value"
          :path="path.concat(node_idx)">
        </x-tree>
      </div>
    </div>
  `,
  props: {
    nodes: Array,
    path: { default: [] },
  },
  computed: {
    root_nodes: vm => vm.$store.tree.children?.value,
  },
  methods: {
    toggle(node_idx) {
      this.$store.tree_toggle(this.path.concat(node_idx));
    },
    select(node_idx) {
      this.$store.tree_select(this.path.concat(node_idx));
    },
    node_is_selected(node_idx) {
      return JSON.stringify(this.$store.selected_treenode_path) == JSON.stringify(this.path.concat(node_idx));
    },
  },
};
