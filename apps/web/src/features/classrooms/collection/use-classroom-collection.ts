import { useCallback, useRef, useState } from 'react';
import type { ClassroomCollectionData, ClassroomCollectionOperations } from './collection-api.ts';
import { createCollectionRequests, type CollectionPart } from './collection-requests.ts';

export const collectionLabels = { rooms: 'tus aulas', drafts: 'tus borradores', invitations: 'tus invitaciones' } as const;

export function useClassroomCollection(operations: ClassroomCollectionOperations) {
  const [data, setData] = useState<Partial<ClassroomCollectionData>>({});
  const [errors, setErrors] = useState<Partial<Record<CollectionPart, boolean>>>({});
  const requests = useRef(createCollectionRequests());
  const load = useCallback(async (signal?: AbortSignal, only?: CollectionPart) => {
    async function read(part: CollectionPart, request: () => Promise<Partial<ClassroomCollectionData>>) {
      const token = requests.current.begin(part, signal);
      setErrors(current => ({ ...current, [part]: false }));
      try {
        const values = await request();
        if (token.current()) setData(previous => ({ ...previous, ...values }));
      } catch {
        if (token.current()) setErrors(previous => ({ ...previous, [part]: true }));
      }
    }
    await Promise.all([
      !only || only === 'rooms' ? read('rooms', () => operations.rooms(signal)) : undefined,
      !only || only === 'drafts' ? read('drafts', async () => ({ drafts: await operations.drafts(signal) })) : undefined,
      !only || only === 'invitations' ? read('invitations', async () => ({ invitations: await operations.invitations(signal) })) : undefined,
    ]);
  }, [operations]);
  return { data, setData, errors, load, invalidate: requests.current.invalidate };
}
