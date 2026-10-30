// Server-only bridge for the existing integration logic. Never exposed to browsers.
import { readFile,rm } from 'node:fs/promises';
import { executeQuery } from './query.ts';
import { db } from './db.ts';
import { integrationContext } from './context.ts';
import { signFile } from './crypto.ts';
import { fileUrl,validatePath,storeFile } from './storage.ts';
import type { Row } from './schema.ts';

class InternalQuery implements PromiseLike<Awaited<ReturnType<typeof executeQuery>>>{
  state:Row;
  constructor(table:string){this.state={table,operation:'select',columns:'*',filters:[],order:[]};}
  select(columns='*',options?:{count?:string;head?:boolean}){this.state.columns=columns;this.state.count=!!options?.count;this.state.head=!!options?.head;return this;}
  insert(values:unknown){this.state.operation='insert';this.state.values=values;return this;}
  update(values:unknown){this.state.operation='update';this.state.values=values;return this;}
  delete(){this.state.operation='delete';return this;}
  upsert(values:unknown){this.state.operation='upsert';this.state.values=values;return this;}
  filter(column:string,op:string,value:unknown){(this.state.filters as Row[]).push({column,op,value});return this;}
  eq(column:string,value:unknown){return this.filter(column,'eq',value);}
  neq(column:string,value:unknown){return this.filter(column,'neq',value);}
  gt(column:string,value:unknown){return this.filter(column,'gt',value);}
  gte(column:string,value:unknown){return this.filter(column,'gte',value);}
  lt(column:string,value:unknown){return this.filter(column,'lt',value);}
  lte(column:string,value:unknown){return this.filter(column,'lte',value);}
  in(column:string,value:unknown[]){return this.filter(column,'in',value);}
  ilike(column:string,value:string){return this.filter(column,'ilike',value);}
  not(column:string,_op:string,value:unknown){return this.filter(column,'not',value);}
  order(column:string,options:{ascending?:boolean;nullsFirst?:boolean}={}){(this.state.order as Row[]).push({column,ascending:options.ascending!==false,...options});return this;}
  limit(limit:number){this.state.limit=limit;return this;}
  range(offset:number,end:number){this.state.offset=offset;this.state.limit=end-offset+1;return this;}
  single(){this.state.single='one';return this;}
  maybeSingle(){this.state.single='maybe';return this;}
  then<TResult1=Awaited<ReturnType<typeof executeQuery>>,TResult2=never>(fulfilled?:((value:Awaited<ReturnType<typeof executeQuery>>)=>TResult1|PromiseLike<TResult1>)|null,rejected?:((reason:unknown)=>TResult2|PromiseLike<TResult2>)|null):PromiseLike<TResult1|TResult2>{
    return executeQuery(this.state,null,true).catch(error=>({data:null,error:{message:error instanceof Error?error.message:'Falha de banco'},count:undefined})).then(fulfilled as never,rejected as never);
  }
}
export function createClient(..._args:unknown[]){
  return {
    from(table:string){return new InternalQuery(table);},
    auth:{
      async getUser(_token?:string){const actor=integrationContext.getStore()?.actor;return {data:{user:actor?{id:actor.id,email:actor.email}:null},error:actor?null:{message:'Unauthorized'}};},
      async getClaims(_token?:string){const actor=integrationContext.getStore()?.actor;return {data:actor?{claims:{sub:actor.id}}:null,error:actor?null:{message:'Unauthorized'}};},
    },
    storage:{from(bucket:string){return {
      async list(prefix='',options:{limit?:number;offset?:number}={}){
        try{const all=await db.storage_objects.findMany({where:{bucket,path:{startsWith:prefix?`${prefix}/`:''}},orderBy:{path:'asc'}});const children=new Map<string,{id:string|null;name:string}>();
          for(const file of all){const rest=file.path.slice(prefix?prefix.length+1:0),name=rest.split('/')[0];children.set(name,{id:rest.includes('/')?null:file.id,name});}
          return {data:[...children.values()].slice(options.offset??0,(options.offset??0)+(options.limit??100)),error:null};
        }catch(error){return {data:null,error};}
      },
      async createSignedUrl(path:string,seconds:number){return {data:{signedUrl:`${fileUrl(bucket,path)}?token=${encodeURIComponent(signFile(bucket,path,seconds))}`},error:null};},
      async download(path:string){try{return {data:new Blob([new Uint8Array(await readFile(validatePath(bucket,path)))]),error:null};}catch(error){return {data:null,error};}},
      async upload(path:string,bytes:Uint8Array,options:{contentType?:string;upsert?:boolean}={}){try{return {data:await storeFile(bucket,path,Buffer.from(bytes),options.contentType??'application/octet-stream',null,options.upsert),error:null};}catch(error){return {data:null,error};}},
      async remove(paths:string[]){for(const path of paths){await db.storage_objects.deleteMany({where:{bucket,path}});await rm(validatePath(bucket,path),{force:true});}return {data:[],error:null};},
    };}},
  };
}
