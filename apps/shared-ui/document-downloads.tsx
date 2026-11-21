import { useState } from 'react';
import { FoxmindIcon } from './FoxmindIcon';
import { downloadBlob, downloadTextDocument } from './text-document';
import type { DocumentIllustration } from './document-pdf';
import styles from './document-editor.module.css';

export function DocumentDownloads({ title, markdown, kind, illustrations, availableIllustrations }: {
  title: string;
  markdown: string;
  kind: string;
  illustrations?: readonly DocumentIllustration[];
  availableIllustrations?: readonly DocumentIllustration[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [illustrationUrl, setIllustrationUrl] = useState('');
  async function downloadPdf() {
    setPending(true);
    setError('');
    try {
      const { createPrivateDocumentPdf } = await import('./document-pdf');
      const illustration = availableIllustrations?.find(image => image.url === illustrationUrl);
      const included = illustrations ?? [];
      const bytes = await createPrivateDocumentPdf({ title, markdown, kind,
        illustrations: illustration && !included.some(image => image.url === illustration.url)
          ? [...included, illustration] : included });
      downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), title, 'pdf');
    } catch {
      setError('No pudimos descargar el PDF. Volvé a intentarlo.');
    } finally {
      setPending(false);
    }
  }
  function downloadWord() {
    setError('');
    try {
      downloadTextDocument(title, markdown);
    } catch {
      setError('No pudimos descargar el Word. Revisá el título y el contenido guardado.');
    }
  }
  return <>
    {availableIllustrations?.length ? <label className={styles.illustrationPicker}>
      Ilustración para el PDF
      <select disabled={pending} value={illustrationUrl} onChange={event => setIllustrationUrl(event.currentTarget.value)}>
        <option value="">Sin ilustración adicional</option>
        {availableIllustrations.map(image => <option key={image.url} value={image.url}>{image.caption}</option>)}
      </select>
    </label> : null}
    <button type="button" onClick={() => void downloadPdf()} disabled={pending}>
      <FoxmindIcon name="download"/>{pending ? 'Preparando PDF…' : 'Descargar PDF'}
    </button>
    <button type="button" onClick={downloadWord}><FoxmindIcon name="download"/>Descargar Word</button>
    {error && <small role="alert" className={styles.downloadError}>{error}</small>}
  </>;
}
