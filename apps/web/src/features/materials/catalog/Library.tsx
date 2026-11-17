import type { LibraryProps } from '../model/library-props.ts';
import { MaterialCatalog } from './MaterialCatalog.tsx';
import { MaterialReaderWorkspace } from '../reader/MaterialReaderWorkspace.tsx';
import { MaterialPublishing } from '../publishing/MaterialPublishing.tsx';
export function Library(props: LibraryProps) {
    if (props.presentation === 'reader')
        return <MaterialReaderWorkspace {...props}/>;
    if (props.presentation === 'upload')
        return <MaterialPublishing {...props} presentation="upload"/>;
    return <MaterialCatalog {...props}/>;
}
