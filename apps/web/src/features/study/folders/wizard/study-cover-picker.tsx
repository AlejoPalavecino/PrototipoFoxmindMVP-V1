import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../../shared-ui/parity-assets';
import { coverOptions } from '../../../../../../shared-ui/academic-cover';
export function StudyCoverPicker({ value, onChange, }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const primary = [
    {
      key: 'literature',
      label: 'Creatividad'

    },
    {
      key: 'biology',
      label: 'Naturaleza'

    },
    {
      key: 'math',
      label: 'Ideas y números'

    },
  ];
  const current = coverOptions(value).find((item) => item.key === value);
  const visible = [
    ...primary,
    ...(current && !primary.some((item) => item.key === current.key) ? [current] : []),
  ];
  return (<fieldset className="class-cover-picker">
    <legend>Una portada para reconocerla</legend>
    <div>
      {visible.map((cover) => (<label className="class-cover-option" key={cover.key}>
        <img src={learningCover(cover.key)} alt="" />
        <span>
          <input
            type="radio"
            name="coverKey"
            checked={value === cover.key}
            onChange={() => onChange(cover.key)} />
          {cover.label}
          <FoxmindIcon name="check" />
        </span>
      </label>))}
    </div>
  </fieldset>);

}
