import { creationOptions } from './catalog-input.ts';
import type { createFoxyCreationRepository } from './creation-repository.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
export function createFoxyCreationService(options: {uow: ReturnType<typeof createFoxyUnitOfWork>; creations: ReturnType<typeof createFoxyCreationRepository>}) {
  return {async list(request: unknown,input: unknown) {
    const page=creationOptions(input);
    return options.uow.run(request,false,(tx,actor)=>options.creations.listPage(tx,actor.id,page));
  }};
}
