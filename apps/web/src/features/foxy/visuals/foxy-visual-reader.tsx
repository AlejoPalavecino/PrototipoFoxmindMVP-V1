import { parseFoxyDiagram } from '../../../../../../src/core/domain/foxy/visual-validation.ts';
import { type FoxyDiagram } from '../../../../../../src/core/domain/foxy/visual.ts';
import { type FoxyPrivateAssetInspection } from '../../../../../../src/core/domain/foxy/asset.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

export type FoxyVisualReaderProps = { assetId:string; inspection:FoxyPrivateAssetInspection|null;loading:boolean;error:string|null;
  onClose():void;onRetry():void;onShare():void;onEdit?():void;onDownload?(text:string):void;
  assetFileUrl(id:string,mode:'preview'|'download'):string;published?:boolean;locked?:boolean;editLocked?:boolean };
export function visualReaderPreview(props: Pick<FoxyVisualReaderProps,'assetId'|'inspection'|'assetFileUrl'|'loading'|'error'>) {
  const info=props.inspection,id=props.assetId;
  if(props.loading||props.error||!info||info.asset.id!==id||info.asset.state!=='READY'||!info.canPreview||!info.payload||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(id))return '';
  const url=props.assetFileUrl(id,'preview');return url===`/api/v1/foxy-ai/assets/${id}/file?mode=preview`?url:'';
}
function readableDiagram(info:FoxyPrivateAssetInspection|null):FoxyDiagram|null{
  if(info?.asset.kind!=='DIAGRAM'||!info.payload?.diagram)return null;
  try{const diagram=parseFoxyDiagram(info.payload.diagram);return diagram.nodes.length?diagram:null;}catch{return null;}
}
export function FoxyVisualReader(props:FoxyVisualReaderProps) {
  const preview=visualReaderPreview(props), info=preview?props.inspection:null;
  const diagram=readableDiagram(info),nodeLabels=new Map(diagram?.nodes.map(node=>[node.id,node.label]));
  const title=info?.editorial?.title??info?.payload?.title??'',description=info?.editorial?.description??info?.payload?.description??'';
  const fileUrl = preview ? props.assetFileUrl(props.assetId, 'download') : '';
  const download = fileUrl === `/api/v1/foxy-ai/assets/${props.assetId}/file?mode=download` ? fileUrl : '';
  const completeDiagram = diagram && [
    title, description,
    'Conceptos\n' + diagram.nodes.map(node => '- ' + node.label).join('\n'),
    ...(diagram.edges.length ? ['Relaciones\n' + diagram.edges.map(edge => `- ${nodeLabels.get(edge.from)} — ${edge.label} → ${nodeLabels.get(edge.to)}`).join('\n')] : []),
  ].filter(Boolean).join('\n\n');
  return <>
    <header><div><h2 id="foxy-visual-reader-title" tabIndex={-1}>Tu creación</h2><p>Imágenes y esquemas</p></div><button type="button" className="p5-close" aria-label="Cerrar diálogo" disabled={props.locked} onClick={props.onClose}><FoxmindIcon name="close"/></button></header>
    <div className="brujula-dialog-body">
      {props.loading?<p role="status">Cargando creación…</p>:!info?<div role="alert"><p>{props.error??'Esta creación no está disponible.'}</p><button type="button" onClick={props.onRetry}>Reintentar</button></div>:<article className="parity-foxy-reader">
        <div className="parity-foxy-readerTitle"><span className="parity-foxy-toolIcon sky"><FoxmindIcon name="layers"/></span><div><small>{props.published?'Compartida desde una versión guardada':'Privada hasta que decidas compartirla'}</small><h3>{title}</h3></div></div>
        {diagram?<section className="parity-foxy-conceptMap" aria-label="Esquema de conceptos">
          <strong>{diagram.title}</strong>
          <ul className="parity-foxy-conceptNodes" aria-label="Conceptos">{diagram.nodes.map(node=><li key={node.id}><FoxmindIcon name="book"/><span>{node.label}</span></li>)}</ul>
          {diagram.edges.length>0&&<div className="parity-foxy-conceptRelations"><h4>Relaciones</h4><ul>{diagram.edges.map((edge,index)=><li className="parity-foxy-conceptRelation" key={index}>
            <span>{nodeLabels.get(edge.from)}</span><span className="parity-foxy-conceptLink">{edge.label}<span aria-label="hacia">→</span></span><span>{nodeLabels.get(edge.to)}</span>
          </li>)}</ul></div>}
        </section>:<figure className="parity-foxy-generatedImage"><img src={preview} alt={title}/></figure>}
        <div className="parity-foxy-readingBody parity-foxy-visualText">{description}</div>
        {props.published&&<p>Editar esta creación no modifica lo que ya compartiste.</p>}
        <p className="parity-foxy-readingNote">Revisá los conceptos y fuentes antes de usarlo.</p>
      </article>}
    </div>
    <footer className="parity-foxy-dialogFooter"><button type="button" onClick={props.onClose}>Cerrar</button>{info&&<>
      {info.canEdit&&props.onEdit&&<button type="button" disabled={props.locked||props.editLocked} onClick={props.onEdit}><FoxmindIcon name="edit"/>Editar</button>}
      <button type="button" onClick={()=>props.onDownload?.(`${title}\n\n${description}`)}><FoxmindIcon name="download"/>Descargar TXT</button>
      {completeDiagram && <button type="button" onClick={() => props.onDownload?.(completeDiagram)}>Descargar esquema completo (TXT)</button>}
      {download && <a className="p5-action" href={download}><FoxmindIcon name="download"/>Descargar archivo visual</a>}
      <button type="button" className="p5-primary" disabled={props.locked} onClick={props.onShare}><FoxmindIcon name="book"/>Llevar a Biblioteca</button>
    </>}</footer>
  </>;
}
