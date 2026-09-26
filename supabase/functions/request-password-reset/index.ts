import { createDeps } from '../_shared/adapters.ts';
import { handleRequestReset } from '../_shared/request-reset.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

Deno.serve((req: Request) => handleRequestReset(req, createDeps(Deno.env.toObject())));
