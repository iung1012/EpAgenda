import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ServerResponse } from 'node:http';
import { requireActor, authenticate, type Actor } from './auth.ts';
import { readScope } from './policy.ts';
import { onChange, type Change } from './query.ts';
import type { Row } from './schema.ts';

const clients=new Set<{req:FastifyRequest;response:ServerResponse;actor:Actor}>();
function matches(row:Row,scope:Row):boolean {
  return Object.entries(scope).every(([key,value])=>key==='OR'?Array.isArray(value)&&value.some(scope=>matches(row,scope as Row)):row[key]===value);
}
export async function emitChange(change:Change){
  for(const client of clients){
    try {
      const actor=await authenticate(client.req);
      if(!actor){client.response.end();clients.delete(client);continue;}
      const scope=readScope(change.table,actor);
      if(matches(change.eventType==='DELETE'?change.old:change.new,scope)) client.response.write(`data: ${JSON.stringify(change)}\n\n`);
    }catch{ /* Permission changes can hide a stream event. */ }
  }
}
export async function registerEvents(app:FastifyInstance){
  onChange(emitChange);
  app.get('/api/events',async(req,reply)=>{
    const actor=await requireActor(req);
    reply.hijack();
    reply.raw.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'private, no-cache, no-transform',Connection:'keep-alive','X-Accel-Buffering':'no'});
    reply.raw.write(': connected\n\n');
    const client={req,response:reply.raw,actor};clients.add(client);
    const heartbeat=setInterval(async()=>{
      if(!await authenticate(req)){reply.raw.end();return;}
      reply.raw.write(': heartbeat\n\n');
    },20000);
    reply.raw.on('close',()=>{clearInterval(heartbeat);clients.delete(client);});
  });
  app.addHook('onClose',async()=>{for(const client of clients)client.response.end();clients.clear();});
}
