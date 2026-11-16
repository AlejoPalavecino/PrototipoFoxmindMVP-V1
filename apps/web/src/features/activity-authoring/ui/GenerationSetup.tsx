import { useState } from 'react';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { GenerationSource } from '../model/activity-generation-api.ts';
import { ActivityGenerationForm, teacherBriefLimit, type GenerationFormValue } from './ActivityGenerationForm.tsx';
import { selectedActivityTopics } from '../model/activity-scope.ts';

export function GenerationSetup({ room, value, update, sources, disabled, generate }: {
 room: Detail; value: GenerationFormValue; update: (value: GenerationFormValue) => void;
 sources: GenerationSource[]; disabled: boolean; generate: (value: GenerationFormValue) => void | Promise<void>;
}) {
 const [error,setError]=useState('');
 return <form className="education-generation-setup" onSubmit={event=>{
  event.preventDefault();if(disabled)return;
  if(!selectedActivityTopics(room.units,value).length){setError('Elegí al menos un tema o una unidad con temas.');return;}
  if(!value.teacherBrief.trim()||[...value.teacherBrief].length>teacherBriefLimit){setError('Escribí una idea para que Foxy prepare la propuesta (hasta 1.200 caracteres).');return;}
  setError('');void generate(value);
 }}>
 {error?<p role="alert" className="p5-notice error">{error}</p>:null}
 <ActivityGenerationForm room={room} value={value} update={next=>{setError('');update(next);}} sources={sources} disabled={disabled}/>
 <footer className="p5-form-footer"><button className="primary" disabled={disabled}>Generar propuesta</button></footer>
 <p className="education-form-note">Generar utiliza IA y puede consumir cuota. Cambiar estos ajustes no genera contenido.</p>
 </form>;
}
