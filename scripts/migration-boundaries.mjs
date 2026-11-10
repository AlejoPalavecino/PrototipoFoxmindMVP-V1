import { builtinModules } from 'node:module';
// Rules for migrated surfaces; no temporary compatibility edges are permitted.
const moduleOf = path => /^apps\/api\/src\/modules\/([^/]+)\/(.+)$/.exec(path);
const featureOf = path => /^apps\/web\/src\/features\/([^/]+)\//.exec(path)?.[1];
const featurePublic = path => /^apps\/web\/src\/features\/[^/]+\/(?:index\.tsx?|api\.ts)$/.test(path);
const shared = path => path.startsWith('apps/shared-ui/') || path.startsWith('apps/web/src/shared/');
const legacyUi = path => /^(?:apps\/(?:classrooms-ui|agenda-ui|p5-preview)\/|apps\/web\/src\/(?:lib|components)\/)/.test(path);
const namedContract = ({ form, binding }) => ['import', 'inline', 'reexport'].includes(form) && binding &&
  binding !== '*' && binding.trim() !== 'typeof' && !binding.includes('* as ');

export function migrationBoundary(edge) {
  const { file, target } = edge;
  const apiOwner = /^apps\/web\/src\/features\/([^/]+)\/api(?:\.ts|\/)/.exec(file)?.[1];
  if (apiOwner) {
    const prefix = `apps/web/src/features/${apiOwner}/`;
    const internal = target.startsWith(prefix + 'api/') ||
      (edge.mode === 'type' && target.startsWith(prefix + 'model/'));
    if ((target.startsWith('apps/') && !internal) || target.startsWith('node:') ||
      builtinModules.includes(target) || /^(?:react(?:-dom)?|next)(?:\/|$)/.test(target)) return 'feature API dependency';
  }
  if (shared(file) && target.startsWith('apps/') && !shared(target)) return 'shared UI dependency';
  const feature = featureOf(file), targetFeature = featureOf(target);
  if (feature && ((targetFeature && targetFeature !== feature) || legacyUi(target) ||
    /^apps\/web\/src\/(?:app|application|screens)\//.test(target))) return 'feature dependency';
  if (targetFeature && targetFeature !== feature &&
    (!featurePublic(target) || !namedContract(edge)))
    return 'feature private API';

  const from = moduleOf(file), to = moduleOf(target);
  const bootstrap = path => path.startsWith('apps/api/src/bootstrap/');
  const platform = path => path.startsWith('apps/api/src/platform/');
  if (bootstrap(file)) return null;
  if (bootstrap(target)) return 'host-only dependency';
  if (platform(file) && target.startsWith('apps/api/src/') && !platform(target)) return 'platform dependency';
  if (from) {
    const [, name, local] = from, layer = local.split('/')[0];
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
    if (target.startsWith('src/core/domain/') || target.startsWith('src/core/contracts/')) return null;
    if (platform(target)) return layer === 'infrastructure' ? null : 'module layer dependency';
    if (target.startsWith('apps/')) return 'cross-module private API';
    return layer === 'application' ? 'module application dependency' : undefined;
  }
  if (to) return to[2] === 'public.ts' && namedContract(edge) ? null : 'cross-module private API';
}
