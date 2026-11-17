import { randomUUID } from 'node:crypto';
import { WallService as Application } from '../modules/communication/wall/public.ts';
import { createWallRepository } from '../modules/communication/wall/infrastructure/wall-repository.ts';
import { feed, thread, repliesPage } from '../modules/communication/wall/infrastructure/wall-read.ts';
export class WallService extends Application {
 constructor(context: ConstructorParameters<typeof Application>[0] & { ports: { signingKey: Buffer } }, dependencies: ConstructorParameters<typeof Application>[1]) {
  const key = context.ports.signingKey;
  super(context, dependencies, createWallRepository(), {
   feed: (tx,actor,room,id,query) => feed(tx,actor,room,key,id,query),
   thread: (tx,actor,room,id,post,anchor) => thread(tx,actor,room,key,id,post,anchor),
   repliesPage: (tx,actor,room,id,post,query,anchor) => repliesPage(tx,actor,room,key,id,post,query,anchor),
  }, randomUUID);
 }
}
