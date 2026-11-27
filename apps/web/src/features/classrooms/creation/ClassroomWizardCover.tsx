import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { coverOptions } from '../../../../../shared-ui/academic-cover.tsx';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
/** The full cover catalog, with the same names as classroom settings. */
export function ClassroomWizardCover({
  payload,
  onUpdate,
}: {
  payload: Payload;
  onUpdate: (key: keyof Payload, value: unknown) => void;
}) {
  return (
    <fieldset className="class-cover-picker">
      <legend>Una portada para reconocerla</legend>
      <div>
        {coverOptions(payload.coverKey).map(cover => (
          <label className="class-cover-option" key={cover.key}>
            <img src={learningCover(cover.key)} alt="" />
            <span>
              <input
                type="radio"
                name="coverKey"
                value={cover.key}
                checked={payload.coverKey === cover.key}
                onChange={() => onUpdate('coverKey', cover.key)}
              />
              {cover.label}
              <FoxmindIcon name="check" />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
