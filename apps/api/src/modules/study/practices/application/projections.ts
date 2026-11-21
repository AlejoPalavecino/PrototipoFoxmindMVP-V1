import type { StoredStudyPractice } from '../../domain/state.ts';
import { publicPractice } from '../../../../../../../src/core/domain/study/engine.ts';
export function practiceView(p: StoredStudyPractice) {
    const { privatePractice, ...safe } = p;
    return { ...safe, ...publicPractice(privatePractice, p.status === 'FINALIZED', p.confirmedQuestionIds) };
}
