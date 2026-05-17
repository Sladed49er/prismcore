# @prismcore/voice

New-branded CallIntel — the VoIP↔AMS middleware (screen pop, AI call logging),
rebuilt on the shared Drizzle/Neon stack.

**Status:** placeholder. Scaffolded Days 11–14 of the build plan.

## Why a parallel build (not a migration)

The live `voip-middleware-portal` (Prisma) keeps serving Mitchell Reed untouched.
`@prismcore/voice` is built alongside it and keeps the **screen-pop endpoint
contract wire-compatible**. When it is proven, Mitchell Reed's VoIP webhook target
is repointed — his pop-ups keep working, now served by Prism Core. Strangler
pattern: no paying customer is at risk.
