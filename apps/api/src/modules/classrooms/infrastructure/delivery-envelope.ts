import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';

/** Authenticated encryption binds each envelope to its record and purpose. */
export function encryptDelivery(key:Buffer,value:unknown,aad:string){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(aad));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
export function decryptDelivery(key:Buffer,value:string,aad:string){
  const bytes=Buffer.from(value,'base64'),decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(aad));decipher.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString());
}
