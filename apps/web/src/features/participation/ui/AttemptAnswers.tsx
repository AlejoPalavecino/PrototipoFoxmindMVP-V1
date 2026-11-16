'use client';
import { useState } from 'react';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import type { AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';

/** Safe history projection, retained while a submitted result is not yet published. */
export function AttemptAnswers({ api, data, teacher = false }: { api: ClassroomClient; data: AttemptSessionData; teacher?: boolean }) {
  const [open, setOpen] = useState(false);
  const title = teacher ? 'Respuestas y archivos' : 'Tu entrega';
  return <div className="student-saved-answers">
    <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>{teacher ? 'Ver respuestas y archivos' : 'Ver lo que entregué'}</button>
    {open ? <Dialog title={title} onClose={() => setOpen(false)}>
    {data.activity.type==='ASSIGNMENT'&&data.attempt?.practicalResponse?<section><h4>Respuesta escrita</h4><p className="p7-multiline">{data.attempt.practicalResponse}</p></section>:null}
    {data.activity.questions.map((question, index) => {
      const answer = data.attempt?.answers.find(item => item.questionId === question.id);
      return <article key={question.id}><h4>Pregunta {index + 1}</h4><p className="p7-multiline">{question.prompt}</p>
        {question.type === 'DEVELOPMENT' ? <p className="p7-multiline">{answer?.text || 'Sin respuesta'}</p>
          : <ul>{question.options.filter(option => answer?.optionIds.includes(option.id!)).map(option => <li key={option.id}>{option.text}</li>)}</ul>}
      </article>;
    })}
    <ul>{data.attempt?.attachments?.map(file => <li key={file.id}>{file.ready
      ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul>
    </Dialog> : null}
  </div>;
}
