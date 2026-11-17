import { studyFail } from '../../../../../../../src/core/domain/study/folders.ts';
export function selectTopics(value: unknown, topics: {
    id: string;
    title: string;
}[]) { if (value === undefined)
    return topics; if (!Array.isArray(value) || value.length > 100 || value.some(id => !topics.some(t => t.id === id)) || new Set(value).size !== value.length)
    studyFail('INVALID_INPUT'); return topics.filter(t => value.includes(t.id)); }
