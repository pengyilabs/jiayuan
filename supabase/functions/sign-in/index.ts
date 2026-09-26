import { createDeps } from '../_shared/adapters.ts';
import { handleSignIn } from '../_shared/sign-in.ts';

// deno-lint-ignore no-explicit-any
declare const Deno: any;

Deno.serve((req: Request) => handleSignIn(req, createDeps(Deno.env.toObject())));
