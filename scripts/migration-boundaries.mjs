import { builtinModules } from 'node:module';
// Module-level contracts/domain and capability layers share the same dependency rules.
const backendLayers = new Set(['domain', 'application', 'infrastructure', 'presentation']);
function moduleOf(path) {
  const match = /^apps\/api\/src\/modules\/([^/]+)\/(.+)$/.exec(path);
  if (!match) return null;
  const [, name, local] = match;
  const parts = local.split('/');
  const capability = backendLayers.has(parts[0]) || local === 'public.ts' ? null : parts[0];
  const surface = capability ? parts.slice(1).join('/') : local;
  return { name, capability, layer: surface.split('/')[0], public: surface === 'public.ts' };
}
const featureOf = path => /^apps\/web\/src\/features\/([^/]+)\//.exec(path)?.[1];
const featurePublic = path => /^apps\/web\/src\/features\/[^/]+\/(?:index\.tsx?|api\.ts)$/.test(path);
const shared = path => path.startsWith('apps/shared-ui/') || path.startsWith('apps/web/src/shared/');
const legacyUi = path => /^(?:apps\/(?:classrooms-ui|agenda-ui|p5-preview)\/|apps\/web\/src\/(?:lib|components)\/)/.test(path);
const namedContract = ({ form, binding }) => ['import', 'inline', 'reexport'].includes(form) && binding &&
  binding !== '*' && binding.trim() !== 'typeof' && !binding.includes('* as ');
const namedBackendContract = edge => namedContract(edge) &&
  (edge.form === 'inline' || edge.binding.startsWith('{'));
const backendLayerDependencies = {
  application: ['application', 'domain'],
  presentation: ['presentation', 'application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
};

export function migrationBoundary(edge) {
  const { file, target } = edge;
  if (file.startsWith('apps/api/src/') && target === 'src/core/domain/index.ts')
    return 'backend global domain entry';
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
    const { name, capability, layer } = from;
    if (from.public) {
      const ownLayer = to && to.capability === capability && ['domain', 'application'].includes(to.layer);
      const capabilityApi = !capability && to?.capability && to.public;
      if (!to || to.name !== name || !(ownLayer || capabilityApi) ||
        edge.form !== 'reexport' || !namedBackendContract(edge))
        return 'module public surface dependency';
      return null;
    }
    if (layer === 'domain') {
      return (to?.name === name && to.layer === 'domain' &&
        (to.capability === capability || !to.capability)) || target.startsWith('src/core/domain/')
        ? null : 'module domain dependency';
    }
    if (to && to.name !== name) return !to.capability && to.public && namedBackendContract(edge)
      ? null : 'cross-module private API';
    if (to) {
      if (to.capability !== capability) {
        if (to.capability) return to.public && namedBackendContract(edge) ? null : 'capability private API';
        // Shared module domain is pure; shared application remains type-contract-only.
        return to.layer === 'domain' || (to.layer === 'application' && edge.mode === 'type')
          ? null : 'capability shared dependency';
      }
      return backendLayerDependencies[layer]?.includes(to.layer) ? null : 'module layer dependency';
    }
    if (target.startsWith('src/core/domain/') || target.startsWith('src/core/contracts/')) return null;
    // D3: presentation layers share the HTTP transport, and nothing else from platform/.
    if (platform(target)) return layer === 'infrastructure' || (layer === 'presentation' && target.startsWith('apps/api/src/platform/http/'))
      ? null : 'module layer dependency';
    if (target.startsWith('apps/')) return 'cross-module private API';
    return layer === 'application' ? 'module application dependency' : undefined;
  }
  if (to) return !to.capability && to.public && namedBackendContract(edge) ? null : 'cross-module private API';
}
