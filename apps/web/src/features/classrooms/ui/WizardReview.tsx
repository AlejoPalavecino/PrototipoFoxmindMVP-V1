import type { FileState } from '../../../../../../src/core/contracts/materials.ts';
import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import { CreationReview } from '../../../../../shared-ui/CreationReview';

export function WizardReview({payload,file,edit}:{payload:Payload;file:FileState|null;edit:(step:number)=>void}) {
  return <CreationReview label="Resumen del aula" title={payload.name} cover={payload.coverKey} units={payload.units??[]}
    fileName={file?.name} edit={edit} details={<><p>{payload.subject} · {payload.division} · {payload.academicYear}</p><p>{payload.timezone}</p></>}/>;
}
