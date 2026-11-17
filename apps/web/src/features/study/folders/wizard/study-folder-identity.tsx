

import { StudyCoverPicker } from './study-cover-picker.tsx';
export function renderStudyFolderIdentity({ name, subject, year, banner, onName, onSubject, onYear, onBanner }: {
  name: string;
  subject: string;
  year: string;
  banner: string;
  onName: (value: string) => void;
  onSubject: (value: string) => void;
  onYear: (value: string) => void;
  onBanner: (value: string) => void;
}) {
  return (<>
    <div className="class-form-grid" data-creation-fields="folder">
      <label>
        Nombre de la carpeta
        <input
          autoFocus
          required
          placeholder="Por ejemplo: Fotografía y luz"
          maxLength={120}
          value={name}
          onChange={event => onName(event.target.value)} />
      </label>
      <div className="class-form-pair">
        <label>
          Materia
          <input
            required
            maxLength={100}
            placeholder="Fotografía"
            value={subject}
            onChange={event => onSubject(event.target.value)} />
        </label>
        <label>
          Año
          <input
            type="number"
            required
            min="1"
            max="9999"
            value={year}
            onChange={event => onYear(event.target.value)} />
        </label>
      </div>
    </div>
    <StudyCoverPicker value={banner} onChange={onBanner} />
  </>);

}
