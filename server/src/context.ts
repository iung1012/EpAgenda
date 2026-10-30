import { AsyncLocalStorage } from 'node:async_hooks';
import type { Actor } from './auth.ts';
export const integrationContext=new AsyncLocalStorage<{actor:Actor|null}>();
