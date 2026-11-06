import {createTextDocument} from '../../src/core/domain/text-document';
export {createTextDocument} from '../../src/core/domain/text-document';
export function downloadTextDocument(title: string, content: string): void {
  const bytes=createTextDocument(title,content),url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
  const link=document.createElement('a');link.href=url;link.download=`${title.replace(/[<>:"/\\|?*\u0000-\u001f]/gu,'_').slice(0,120) || 'Recurso'}.docx`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
