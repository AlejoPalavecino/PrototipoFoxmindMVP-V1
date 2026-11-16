import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';

export type ActivityScope = { unitIds: string[]; topicIds: string[] };

export function selectedActivityTopics(units: Detail['units'], scope: ActivityScope) {
  const unitIds = new Set(scope.unitIds), topicIds = new Set(scope.topicIds);
  return units.map(unit => ({
    ...unit,
    topics: unit.topics.filter(topic => topic.id && ((unit.id && unitIds.has(unit.id)) || topicIds.has(topic.id))),
  })).filter(unit => unit.topics.length);
}
