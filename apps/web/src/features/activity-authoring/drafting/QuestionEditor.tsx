'use client';
import { useId } from 'react';
import type { ActivityQuestion } from '../../../../../../src/core/contracts/activities.ts';

export function QuestionEditor({ question, index, update, remove, fixedType = false }: {
  question: ActivityQuestion; index: number; update: (question: ActivityQuestion) => void; remove?: () => void; fixedType?: boolean;
}) {
  const correctGroup = useId();
  return <fieldset className="p7-question"><legend>Pregunta {index + 1}</legend>
    <label>Tipo de pregunta<select aria-label="Tipo de pregunta" disabled={fixedType} value={question.type} onChange={e => {
      const type = e.target.value as ActivityQuestion['type'];
      update({ ...question, type, scoringRule: type === 'DEVELOPMENT' ? null : 'EXACT', options: type === 'DEVELOPMENT' ? []
        : [{ text: '', correct: true }, { text: '', correct: type === 'MULTIPLE_CHOICE' }] });
    }}><option value="DEVELOPMENT">Desarrollo</option><option value="SINGLE_CHOICE">Una respuesta correcta</option><option value="MULTIPLE_CHOICE">Varias respuestas correctas</option></select></label>
    <label>Consigna de la pregunta<textarea value={question.prompt} onChange={e => update({ ...question, prompt: e.target.value })} /></label>
    <label>Puntos disponibles<input inputMode="decimal" value={question.points} onChange={e => update({ ...question, points: e.target.value.replace(',', '.') })} /></label>
    <small>Valor positivo con hasta dos decimales. No se ejecuta una calificación al guardar.</small>
    {question.type === 'MULTIPLE_CHOICE' ? <label>Regla de puntuación<select aria-label="Regla de puntuación" value={question.scoringRule ?? 'EXACT'} onChange={e => update({ ...question, scoringRule: e.target.value as 'EXACT' | 'PARTIAL' })}>
      <option value="EXACT">Coincidencia exacta</option><option value="PARTIAL">Puntaje parcial sin opciones incorrectas</option>
    </select></label> : null}
    {question.options.map((option, position) => <div className="p7-option" key={position}>
      <label>Opción {position + 1}<input value={option.text} onChange={e => update({ ...question, options: question.options.map((o, n) => n === position ? { ...o, text: e.target.value } : o) })} /></label>
      <label className="p7-check"><input type={question.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name={correctGroup} checked={option.correct ?? false} onChange={e => update({ ...question,
        options: question.options.map((o, n) => ({ ...o, correct: n === position ? e.target.checked : question.type === 'SINGLE_CHOICE' && e.target.checked ? false : o.correct })) })} />Correcta</label>
      <button type="button" onClick={() => update({ ...question, options: question.options.filter((_, n) => n !== position) })}>Quitar opción</button>
    </div>)}
    {question.type !== 'DEVELOPMENT' ? <button type="button" onClick={() => update({ ...question, options: [...question.options, { text: '', correct: false }] })}>Agregar opción</button> : null}
    {remove ? <button type="button" onClick={remove}>Quitar pregunta</button> : null}
  </fieldset>;
}
