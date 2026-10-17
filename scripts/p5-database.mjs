import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
import pg from 'pg';
import {resolve} from 'node:path';

// No DATABASE_URL input, no existing DB/volume, no shared dev resource cleanup.
export async function withP5Database(run) {
  const owner=randomBytes(12).toString('hex'), name=`foxmind-p5-${owner}`;
  const password=randomBytes(32).toString('hex');
  let created=false,pool,result,cleanupError;
  const docker=(...args)=>{
    const r=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:20000,
      env:{...process.env,POSTGRES_PASSWORD:password}});
    if(r.error||r.status!==0)throw new Error(`P5 owned Docker ${args[0]} failed`);
    return r.stdout.trim();
  };
  try {
    docker('run','-d','--rm','--pull=never','--name',name,'--label',`foxmind.p5.owner=${owner}`,
      '--memory=512m','--cpus=1','--pids-limit=128','-p','127.0.0.1::5432','--tmpfs','/var/lib/postgresql/data',
      '-e','POSTGRES_PASSWORD','-e','POSTGRES_DB=p5','postgres:17.10-bookworm');created=true;
    const port=Number(docker('inspect','--format','{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}',name));
    pool=new pg.Pool({host:'127.0.0.1',port,user:'postgres',password,database:'p5',max:8,connectionTimeoutMillis:2000,
      statement_timeout:5000,idle_in_transaction_session_timeout:6000});
    let ready=false;
    for(let i=0;i<100;i++) {try{await pool.query('SELECT 1');ready=true;break;}catch{await pause(300);}}
    if(!ready)throw new Error('P5 database readiness timeout');
    const env={...process.env,DATABASE_URL:`postgresql://postgres:${password}@127.0.0.1:${port}/p5`};
    for(const args of [['migrate','deploy'],['migrate','deploy'],['migrate','status'],
      ['migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--exit-code']]) {
      const step=spawnSync(process.execPath,[resolve('node_modules/prisma/build/index.js'),...args],
        {env,encoding:'utf8',windowsHide:true,timeout:30000});
      // Prisma diagnostics can contain connection data. Do not dump subprocess output.
      if(step.error||step.status!==0)throw new Error(`P5 migration ${args.slice(0,2).join('/')} failed (sanitized)`);
    }
    const database={$transaction:async fn=>{
      const client=await pool.connect();
      try {await client.query('BEGIN'); const value=await fn({$queryRawUnsafe:async(sql,...args)=>(await client.query(sql,args)).rows});
        await client.query('COMMIT'); return value;
      }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    }};
    result=await run({pool,database,env});
  } finally {
    if(pool)try{await pool.end();}catch{cleanupError=new Error('P5 pool cleanup failed');}
    if(created)try{
      const actual=docker('inspect','--format','{{index .Config.Labels "foxmind.p5.owner"}}',name);
      if(actual!==owner)throw new Error('Ownership mismatch');
      docker('rm','--force',name);
      console.log('P5 owned database cleanup: exit0');
    }catch{cleanupError=new Error('P5 owned database cleanup failed');}
    if(cleanupError)throw cleanupError;
  }
  return result;
}
