import { createTextDocument } from '../../src/core/domain/documents/text-document.ts';
export { createTextDocument } from '../../src/core/domain/documents/text-document.ts';
export function downloadTextDocument(title: string, content: string): void {
  const bytes=createTextDocument(title,content);
  download(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),title,'docx');
}
export function downloadPlainText(title: string, content: string): void {
  download(new Blob([content],{type:'text/plain;charset=utf-8'}),title,'txt');
}
function download(blob: Blob, title: string, extension: 'docx'|'txt'): void {
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=`${title.replace(/[<>:"/\\|?*\u0000-\u001f]/gu,'_').slice(0,120) || 'Recurso'}.${extension}`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
