import { HOME_MODULES, type HomeQuery, type HomePageQuery, type HomeResponse, type HomeModuleResponse, type HomeModules } from './home.ts';
import { homeObject, homeZone, homeEnum, homeCursor, homeId, homeInstant, homeCount, homeInvalid } from './values.ts';
import { parseHomePage } from './rows-validation.ts';
export { parseHomeTarget } from './target.ts';
export function parseHomeQuery(input: unknown): HomeQuery {
  const value = homeObject(input, ['timeZone']); return { timeZone: homeZone(value.timeZone) };
}
export function parseHomePageQuery(input: unknown): HomePageQuery {
  const value = homeObject(input, ['timeZone', 'module', 'cursor']);
  return { timeZone: homeZone(value.timeZone), module: homeEnum(value.module, HOME_MODULES), cursor: homeCursor(value.cursor) };
}
export function parseHomeResponse(input: unknown): HomeResponse {
  const value = homeObject(input, ['version', 'subjectId', 'generatedAt', 'timeZone', 'participation', 'memberships', 'setup', 'modules']);
  if (value.version !== 1) return homeInvalid();
  const memberships = homeObject(value.memberships, ['study', 'teach', 'archived']);
  for (const count of Object.values(memberships)) homeCount(count);
  const setup = homeObject(value.setup, ['drafts', 'invitations']);
  for (const count of Object.values(setup)) homeCount(count);
  const raw = value.modules;
  const additive = ['drafts', 'submitted'];
  const source = homeObject(raw, HOME_MODULES.filter(name => !additive.includes(name) || !!raw && typeof raw === 'object' && name in raw));
  const modules = Object.fromEntries(HOME_MODULES.map(name => [name, parseHomePage(name, source[name] ?? { status: 'not-applicable' })])) as unknown as HomeModules;
  return { version: 1, subjectId: homeId(value.subjectId), generatedAt: homeInstant(value.generatedAt),
    timeZone: homeZone(value.timeZone), participation: homeEnum(value.participation, ['study', 'teach', 'mixed', 'none']),
    memberships: memberships as unknown as HomeResponse['memberships'], setup: setup as unknown as HomeResponse['setup'], modules };
}
export function parseHomeModuleResponse(input: unknown): HomeModuleResponse {
  const value = homeObject(input, ['subjectId', 'generatedAt', 'module', 'page']);
  const module = homeEnum(value.module, HOME_MODULES);
  return { subjectId: homeId(value.subjectId), generatedAt: homeInstant(value.generatedAt), module, page: parseHomePage(module, value.page) };
}
