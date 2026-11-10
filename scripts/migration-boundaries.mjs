// Rules for migrated surfaces; legacy modules retain their exact frozen edges.
const moduleOf = path => /^apps\/api\/src\/modules\/([^/]+)\/(.+)$/.exec(path);
const featureOf = path => /^apps\/web\/src\/features\/([^/]+)\//.exec(path)?.[1];
const shared = path => path.startsWith('apps/shared-ui/') || path.startsWith('apps/web/src/shared/');
const legacyUi = path => /^(?:apps\/(?:classrooms-ui|agenda-ui|p5-preview)\/|apps\/web\/src\/(?:lib|components)\/)/.test(path);
const namedContract = ({ form, binding }) => ['import', 'inline', 'reexport'].includes(form) && binding &&
  binding !== '*' && binding.trim() !== 'typeof' && !binding.includes('* as ');

export function migrationBoundary(edge) {
  const { file, target } = edge;
  if (shared(file) && target.startsWith('apps/') && !shared(target)) return 'shared UI dependency';
  const feature = featureOf(file), targetFeature = featureOf(target);
  if (feature && ((targetFeature && targetFeature !== feature) || legacyUi(target) ||
    /^apps\/web\/src\/(?:app|application|screens)\//.test(target))) return 'feature dependency';
  if (targetFeature && targetFeature !== feature &&
    (!/^apps\/web\/src\/features\/[^/]+\/index\.tsx?$/.test(target) || !namedContract(edge)))
    return 'feature private API';

  const from = moduleOf(file), to = moduleOf(target);
  const bootstrap = path => path.startsWith('apps/api/src/bootstrap/');
  const platform = path => path.startsWith('apps/api/src/platform/');
  if (bootstrap(file)) return null;
  if (platform(file) && target.startsWith('apps/api/src/') && !platform(target)) return 'platform dependency';
  if (from) {
    const [, name, local] = from, layer = local.split('/')[0];
    if (bootstrap(target)) return 'host-only dependency';
    if (local === 'public.ts') {
      if (!to || to[1] !== name || !/^(?:domain|application)\//.test(to[2]) || !namedContract(edge))
        return 'module public surface dependency';
      return null;
    }
    if (layer === 'domain') {
      return (to?.[1] === name && to[2].startsWith('domain/')) || target.startsWith('src/core/domain/')
        ? null : 'module domain dependency';
    }
    if (to && to[1] !== name) return to[2] === 'public.ts' && namedContract(edge) ? null : 'cross-module private API';
    if (to) {
      const allowed = {
        application: ['application', 'domain'],
        presentation: ['presentation', 'application', 'domain'],
        infrastructure: ['infrastructure', 'application', 'domain'],
      }[layer];
      return allowed?.includes(to[2].split('/')[0]) ? null : 'module layer dependency';
    }
    if (target.startsWith('src/core/domain/')) return null;
    if (platform(target)) return layer === 'infrastructure' ? null : 'module layer dependency';
    if (target.startsWith('apps/')) return 'cross-module private API';
    return layer === 'application' ? 'module application dependency' : undefined;
  }
  if (to) return to[2] === 'public.ts' && namedContract(edge) ? null : 'cross-module private API';
}
