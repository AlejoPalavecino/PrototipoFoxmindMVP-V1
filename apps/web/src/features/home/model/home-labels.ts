import type { HomeModuleName, HomeModules, HomeTarget, HomeResponse } from '../../../../../../src/core/domain/index.ts';
export type HomeRowItem = Extract<HomeModules[HomeModuleName],{status:'ready'}>['items'][number];
export const homeLabels:Record<HomeModuleName,{title:string;empty:string;action:string}>={
  pending:{title:'Para entregar',empty:'Estás al día. No hay actividades pendientes de entrega.',action:'Ver actividad'},
  review:{title:'Para revisar',empty:'No hay entregas pendientes de revisión o publicación.',action:'Revisar entregas'},
  feedback:{title:'Devoluciones disponibles',empty:'Aún no hay devoluciones publicadas disponibles.',action:'Ver devolución'},
  agenda:{title:'Tu agenda',empty:'No tenés próximos eventos ni vencimientos.',action:'Abrir'},
  queries:{title:'Consultas sin responder',empty:'No hay consultas por responder en tus aulas activas.',action:'Abrir consulta'},
  materials:{title:'Material reciente',empty:'No hay material disponible en tus aulas activas.',action:'Abrir material'},
  classrooms:{title:'Tus aulas',empty:'No hay aulas disponibles en esta vista.',action:'Entrar al aula'},
  drafts:{title:'Actividades en borrador',empty:'No tenés actividades en borrador en tus aulas activas.',action:'Continuar borrador'},
  submitted:{title:'Entregadas, en revisión',empty:'No tenés entregas esperando revisión.',action:'Ver entrega'},
};
export function homeTime(value:string,zone:string):string {
  return new Date(value).toLocaleString('es-AR',{timeZone:zone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
}
export function homeParticipation(data:HomeResponse,accountRole:'teacher'|'student'):string {
  const {study,teach,archived}=data.memberships;
  if(data.participation==='none')return archived?'Tu historial de aulas sigue disponible.':accountRole==='teacher'?'Crea un aula para dar el primer paso.':'Únete a un aula para dar el primer paso.';
  return `${study} ${study===1?'aula en Estudio':'aulas en Estudio'} · ${teach} ${teach===1?'aula en Enseño':'aulas en Enseño'}`;
}
export type HomeAction = (target:HomeTarget)=>void;
