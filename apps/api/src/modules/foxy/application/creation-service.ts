import type { FoxyCreationRepositoryPort, FoxyUnitOfWork } from './ports.ts';
import { creationOptions } from '../domain/catalog-input.ts';
export function createFoxyCreationService(options: {uow: FoxyUnitOfWork; creations: FoxyCreationRepositoryPort}) {
  return {async list(request: unknown,input: unknown) {
    const page=creationOptions(input);
    return options.uow.run(request,false,(tx,actor)=>options.creations.listPage(tx,actor.id,page));
  }};
}
