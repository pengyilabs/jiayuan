import { createDeps } from '../_shared/adapters.ts';
import { handleSyncUserAccess } from '../_shared/sync-user-access.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

Deno.serve((req: Request) => handleSyncUserAccess(req, createDeps(Deno.env.toObject())));
