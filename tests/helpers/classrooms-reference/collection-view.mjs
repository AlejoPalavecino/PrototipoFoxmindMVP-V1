import React from 'react';
import { hookView } from '../../agenda-ui-helpers.test.mjs';

// Expand only the extracted stateless controls; card hooks and component logic stay real.
function expand(node) {
  if (Array.isArray(node)) return node.map(expand);
  if (!React.isValidElement(node)) return node;
  if (['ClassroomCollectionFilters', 'AdvancedFilters'].includes(node.type?.name)) return expand(node.type(node.props));
  return React.cloneElement(node, undefined, expand(node.props.children));
}
export function collectionView(Component, props) {
  const view = hookView(Component, props);
  return { ...view, get tree() { return expand(view.tree); } };
}
