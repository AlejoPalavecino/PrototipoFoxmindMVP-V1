import type { StudyOptions } from '../../../application/contracts.ts';
type Generate = NonNullable<StudyOptions['generate']>;
// @ts-expect-error A provider result must contain the validated StudyResult contract.
const invalidResult: Generate = async () => ({ unexpected: true });
// @ts-expect-error A provider receives a valid study action, never an arbitrary command.
const invalidInput: Parameters<Generate>[0] = { action: 'PUBLISH' };
void invalidResult; void invalidInput;
