import { useEffect, useState } from 'react';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import type { LibraryProps } from '../model/library-props.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { MaterialReader } from './MaterialReader.tsx';
export function MaterialReaderWorkspace({ api, room, targetMaterialId, materials, material, active = true, onReaderClose }: LibraryProps) {
    const [reading, setReading] = useState<Material>();
    const [loaded, setLoaded] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!active)
            return;
        const controller = new AbortController();
        setDismissed(false);
        setLoaded(false);
        setError('');
        setReading(undefined);
        const resolve = material ? Promise.resolve(material) : targetMaterialId
            ? api.findMaterial(room.id, targetMaterialId, { materials, signal: controller.signal })
            : Promise.resolve(undefined);
        void resolve.then(next => {
            if (controller.signal.aborted)
                return;
            setReading(next?.ready && !next.deleted ? next : undefined);
            setLoaded(true);
        }).catch(error => { if (!controller.signal.aborted)
            setError(error.message); });
        return () => controller.abort();
    }, [api, room.id, targetMaterialId, materials, material, active, retry]);
    if (!active || dismissed)
        return null;
    const close = () => { setDismissed(true); onReaderClose?.(); };
    if (reading)
        return <MaterialReader api={api} room={room} material={reading} writable={room.role === 'teacher' && !room.archived} busy={false} onClose={close} onEdit={() => { }} onDelete={() => { }}/>;
    return <Dialog title={loaded ? 'Material no disponible' : 'Abriendo material'} onClose={close}>
    {error ? <Notice error>{error}<button onClick={() => setRetry(value => value + 1)}>Reintentar</button></Notice>
            : loaded ? <p>El material ya no está disponible para tu cuenta.</p> : <p role="status">Cargando material…</p>}
    <button type="button" onClick={close}>Cerrar</button>
  </Dialog>;
}
