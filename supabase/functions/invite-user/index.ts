import { createDeps } from '../_shared/adapters.ts';
import { handleInviteUser } from '../_shared/invite-user.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

Deno.serve((req: Request) => handleInviteUser(req, createDeps(Deno.env.toObject())));
