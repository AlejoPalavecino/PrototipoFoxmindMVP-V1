import {createHash,randomUUID} from 'node:crypto';
import {studyFileError,studyFileReady,studyUploadIntent} from './upload-policy.ts';
import type {StudyFilePorts,StudyFileQuery,StudyUploadRow} from './types.ts';

function status(row:StudyUploadRow) {
  return {id:row.id,name:row.original_name,sizeBytes:Number(row.size_bytes),ready:studyFileReady(row),
    upload:row.phase==='READY'?'COMPLETED':row.phase==='STARTED'?'STARTED':row.phase==='PROCESSING'?'UPLOADING':'FAILED',
    validation:row.validated_digest?'APPROVED':row.phase==='REJECTED'?'REJECTED':'PENDING',
    scan:row.scanned_digest?'CLEAN':row.phase==='REJECTED'?'REJECTED':'PENDING',rejectionCode:row.rejection_code};
}
const idPattern=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
export function createStudyFiles(ports:StudyFilePorts) {
  let active=0;
  async function transaction<T>(request:unknown,folderId:string,write:boolean,operation:(tx:StudyFileQuery,owner:string)=>Promise<T>) {
    if(!idPattern.test(folderId)) return studyFileError('INVALID_INPUT');
    return ports.database.$transaction(async raw=>{
      const tx:StudyFileQuery={query:(sql,...values)=>raw.$queryRawUnsafe(sql,...values)};
      const owner=await ports.authenticate(tx,request,write);
      const [user]=await tx.query<{account_role:string;email_verified_at:Date|null}>('SELECT account_role,email_verified_at FROM users WHERE id=$1::uuid FOR UPDATE',owner);
      if(user?.account_role!=='student'||!user.email_verified_at) return studyFileError('FORBIDDEN');
      const [folder]=await tx.query<{status:string}>('SELECT status FROM study_folders WHERE id=$1::uuid AND owner_id=$2::uuid FOR SHARE',folderId,owner);
      if(!folder||folder.status==='DELETED'||write&&folder.status==='ARCHIVED')return studyFileError('FORBIDDEN');
      if(await ports.authenticate(tx,request,write)!==owner) return studyFileError('FORBIDDEN');
      const result=await operation(tx,owner);
      if(await ports.authenticate(tx,request,write)!==owner)return studyFileError('FORBIDDEN');
      return result;
    },{maxWait:2000,timeout:6000});
  }
  async function load(tx:StudyFileQuery,owner:string,folder:string,id:string) {
    if(!idPattern.test(id))return studyFileError('INVALID_INPUT');
    const [row]=await tx.query<StudyUploadRow>('SELECT * FROM study_folder_uploads WHERE id=$1::uuid AND folder_id=$2::uuid AND owner_id=$3::uuid',id,folder,owner);
    if(!row)return studyFileError('FORBIDDEN');return row;
  }
  return {
    async begin(request:unknown,folder:string,input:unknown) {
      const intent=studyUploadIntent(input);
      return transaction(request,folder,true,async(tx,owner)=>{
        const [{used}]=await tx.query<{used:bigint}>('SELECT COALESCE(sum(size_bytes),0)::bigint AS used FROM study_folder_uploads WHERE owner_id=$1::uuid',owner);
        if(used+BigInt(intent.bytes)>(ports.quotaBytes??250_000_000n))return studyFileError('QUOTA_EXCEEDED');
        const id=randomUUID();
        const [row]=await tx.query<StudyUploadRow>(`INSERT INTO study_folder_uploads(id,folder_id,owner_id,purpose,original_name,extension,size_bytes,storage_key)
          VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::bigint,$8) RETURNING *`,id,folder,owner,intent.purpose,intent.name,intent.extension,BigInt(intent.bytes),`p4/${id}/blob`);
        return status(row);
      });
    },
    async status(request:unknown,folder:string,id:string) {return transaction(request,folder,false,async(tx,owner)=>status(await load(tx,owner,folder,id)));},
    async receive(request:unknown,folder:string,id:string,input:Buffer) {
      if(active>=2)return studyFileError('SERVICE_UNAVAILABLE');
      if(!Buffer.isBuffer(input)||input.length<1||input.length>50_000_000)return studyFileError('INVALID_UPLOAD');
      active++;
      const bytes=Buffer.from(input),digest=createHash('sha256').update(bytes).digest('hex'),operation=randomUUID();
      let row:StudyUploadRow|undefined;
      try {
        row=await transaction(request,folder,true,async(tx,owner)=>{
          const row=await load(tx,owner,folder,id);
          if(studyFileReady(row)) {if(row.digest!==digest)return studyFileError('CONFLICT');return row;}
          if(row.phase!=='STARTED')return studyFileError('CONFLICT');
          if(row.size_bytes!==BigInt(bytes.length))return studyFileError('INVALID_UPLOAD');
          const [locked]=await tx.query<StudyUploadRow>(`UPDATE study_folder_uploads SET phase='PROCESSING',operation_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid AND phase='STARTED' RETURNING *`,id,operation);
          if(!locked)return studyFileError('CONFLICT');return locked;
        });
        if(studyFileReady(row))return status(row);
        const mime=await ports.inspect(bytes,row.extension);
        await ports.scan(bytes);
        await transaction(request,folder,true,async(tx,owner)=>{await load(tx,owner,folder,id);});
        await ports.storage.put(row.storage_key,bytes);
        return await transaction(request,folder,true,async(tx,owner)=>{
          await load(tx,owner,folder,id);
          const [ready]=await tx.query<StudyUploadRow>(`UPDATE study_folder_uploads SET phase='READY',mime=$3,digest=$4,validated_digest=$4,scanned_digest=$4,updated_at=clock_timestamp()
            WHERE id=$1::uuid AND operation_id=$2::uuid AND phase='PROCESSING' RETURNING *`,id,operation,mime,digest);
          if(!ready)return studyFileError('CONFLICT');return status(ready);
        });
      } catch(error) {
        if(row&&!studyFileReady(row)) {
          // Keep quarantine closed; failures never expose unapproved bytes.
          const code=error&&typeof error==='object'&&'code'in error?String(error.code):'SERVICE_UNAVAILABLE';
          await ports.database.$transaction(async tx=>{await tx.$queryRawUnsafe(`UPDATE study_folder_uploads SET phase=$3,rejection_code=$4,updated_at=clock_timestamp()
            WHERE id=$1::uuid AND operation_id=$2::uuid AND phase='PROCESSING' RETURNING id`,id,operation,code==='FILE_REJECTED'?'REJECTED':'ERROR',code==='FILE_REJECTED'?'FILE_REJECTED':'SERVICE_UNAVAILABLE');}).catch(()=>{});
        }
        throw error;
      }finally{active--;}
    },
    async read(request:unknown,folder:string,id:string) {
      const row=await transaction(request,folder,false,(tx,owner)=>load(tx,owner,folder,id));
      if(!studyFileReady(row))return studyFileError('FILE_NOT_READY');
      const bytes=await ports.storage.get(row.storage_key,Number(row.size_bytes));
      if(bytes.length!==Number(row.size_bytes)||createHash('sha256').update(bytes).digest('hex')!==row.digest)return studyFileError('FILE_NOT_READY');
      await transaction(request,folder,false,(tx,owner)=>load(tx,owner,folder,id));
      return {bytes,mime:row.mime??'application/octet-stream',name:row.original_name};
    },
  };
}
