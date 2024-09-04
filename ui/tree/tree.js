const methods = {
  _render() {
    const nodes = this.nodes || this.$store.tree.children?.value;

    return {
      tag: 'div',
      class: 'tree',
      style: { '--tree-level': this.path.length + 1 },
      inner: nodes.map((node, node_idx) => ({
        tag: 'div',
        class: 'tree-branch',
        inner: [
          {
            tag: 'div',
            class: 'tree-node',
            'data-type': node.type,
            'data-selected': this.node_is_selected(node_idx) || null,
            'data-expanding': !!node.children?.loading || null,
            'data-expanded': !!node.children?.value || null,
            onClick: _ => this.select(node_idx),
            inner: [
              {
                tag: 'span',
                class: 'tree-marker',
                // TODO aria
              },
              {
                tag: 'span',
                class: 'tree-caption',
                inner: [
                  node.name,
                  ' ',
                  { tag: 'span', class: 'tree-comment', inner: [node.comment] },
                ],
              },
              {
                tag: 'span',
                class: 'tree-loader',
              },
              node.expandable && {
                tag: 'button',
                class: 'tree-toggler',
                onClick: e => (e.stopPropagation(), this.toggle(node_idx)),
              },
            ],
          },
          node.children?.value && {
            tag: xTree,
            class: 'tree-children',
            nodes: node.children.value,
            path: [...this.path, node_idx],
          },
        ],
      })),
    };
  },
  toggle(node_idx) {
    this.$store.tree_toggle(this.path.concat(node_idx));
  },
  select(node_idx) {
    this.$store.tree_select(this.path.concat(node_idx));
  },
  node_is_selected(node_idx) {
    return JSON.stringify(this.$store.curr_treenode_path) == JSON.stringify(this.path.concat(node_idx));
  },
};

const xTree = {
  props: {
    nodes: Array,
    path: { default: [] },
  },
  methods,
};

export default xTree;
