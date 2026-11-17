import type { HomeModules, HomeModuleName } from '../../../../../../src/core/domain/home/home.ts';
import { HomeClientError, type HomeClient } from '../api/home-api.ts';

/** The reference queue has no pagination control: complete its real projection before showing it. */
export async function completeHomeQueue(client:HomeClient,module:Extract<HomeModuleName,'review'|'queries'>,initial:HomeModules[HomeModuleName],subjectId:string,timeZone:string,order:'asc'|'desc',signal?:AbortSignal):Promise<HomeModules[HomeModuleName]> {
 if(initial.status!=='ready')return initial;
 let page=initial;const seen=new Set<string>();
 while(page.nextCursor){
  if(seen.has(page.nextCursor)||seen.size>=100)throw new HomeClientError('SERVICE_UNAVAILABLE',503);
  seen.add(page.nextCursor);signal?.throwIfAborted();
  const result=await client.page({module,timeZone,order,cursor:page.nextCursor},signal);signal?.throwIfAborted();
  if(result.subjectId!==subjectId)throw new HomeClientError('FORBIDDEN',403);
  if(result.module!==module||result.page.status!=='ready')throw new HomeClientError('SERVICE_UNAVAILABLE',503);
  const next=result.page;
  page={...page,...next,items:[...page.items,...next.items.filter(item=>!page.items.some(old=>old.id===item.id))]} as typeof page;
 }
 return page;
}
