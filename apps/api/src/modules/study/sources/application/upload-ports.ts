export interface StudyFileQuery {query<T=Record<string,unknown>>(sql:string,...values:unknown[]):Promise<T[]>}
export interface StudyFileDatabase {$transaction<T>(operation:(tx:{$queryRawUnsafe<T=unknown>(sql:string,...values:unknown[]):Promise<T>})=>Promise<T>,options?:{maxWait:number;timeout:number}):Promise<T>}
export interface StudyUploadRow {id:string;folder_id:string;owner_id:string;purpose:'plan'|'material';original_name:string;extension:string;size_bytes:bigint;storage_key:string;phase:string;mime:string|null;digest:string|null;validated_digest:string|null;scanned_digest:string|null;rejection_code:string|null;operation_id:string|null}
export interface StudyFilePorts {
  database:StudyFileDatabase;
  authenticate(tx:StudyFileQuery,request:unknown,write:boolean):Promise<string>;
  storage:{put(key:string,bytes:Buffer):Promise<void>;get(key:string,limit:number):Promise<Buffer>;remove(key:string):Promise<void>};
  inspect(bytes:Buffer,extension:string):Promise<string>;
  scan(bytes:Buffer):Promise<void>;
  quotaBytes?:bigint;
}
