# Prism Core — June 3 Demo Script

**Live:** https://prismcore-gray.vercel.app — signed in as `matt@prismams.com`
**Length:** ~10 minutes
**Audience:** independent agency principals, MGAs, carriers (PIA convention)

The demo runs on **Demo Agency**, a workspace already built out with realistic
data (calls, tickets, connected carriers, custom fields) so nothing looks empty.

## The arc

Open on the pain everyone in the room lives with. Show Prism Core erasing it,
piece by piece. Close on the economics.

## 0. The hook (30 sec — before touching the screen)

> "Every agency here pays for an AMS where you use maybe 5% of the features — and
> pays again to bolt on the parts it's missing. Vertafore, AMS360, Applied. And
> when you want to connect something? Applied charges $7,500 a year just to open
> an API. We built the opposite of that."

## 1. The composer — "software your way" (2 min) — `/compose`

- "A new agency doesn't get handed a 400-feature monster. They answer two
  questions."
- Step 1 — pick **Insurance Agency**. "Or a wealth firm, or an association —
  same platform, different starting point."
- Step 2 — toggle an add-on or two (PrismVoice, the API Clearinghouse).
- Step 3 — the review screen. "Every module they need, nothing they don't — and
  the price is right there. They pay for exactly this, per user, per month."

## 2. The workspace (1 min) — `/dashboard`

- "This is Demo Agency. The sidebar is generated from exactly the modules they
  picked — add a module and it appears, remove one and it's gone."

## 3. Customize it yourself (1.5 min) — `/settings/customize`

- "Here's what no AMS does. The agency adds their own fields — no developer, no
  change request, no waiting on a vendor."
- Add a field live: **"Renewal call notes"**, type text. "Done. It's on their
  client record now — and only theirs."
- "This is the difference between software you rent and software that's yours."

## 4. The API Clearinghouse (2 min) — `/m/api_clearinghouse`

- "Remember that $7,500 SDK fee? Here every carrier and MGA is one click. No
  licensing fees, no per-call charges."
- Search **cannabis** → Greenleaf Specialty. "An agency needs a market for a
  dispensary in Oregon — they find it and connect it in five seconds."
- "Every carrier we add joins the pool for everyone. It becomes a marketplace."

## 5. PrismVoice — the call center, inside Prism (1.5 min) — `/m/telephony`

- "This used to be a separate product. We rebuilt it as a module — one login."
- Click **Simulate inbound call** → a call pops in, caller matched, AI summary.
- "The phone rings, the client's record is already on screen, the call logs
  itself, AI writes the summary. No separate app, no separate bill."

## 6. Support — the agency's own panel (1 min) — `/support`

- "Every agency has its own support panel — they file requests, we work them.
  Everything here is private to their workspace."

## 7. The admin view (1 min — for Tony / partners) — `/admin`

- "Behind it all — one console. Every tenant, every ticket. We patch a security
  hole once and every agency is covered the same minute. The agencies get total
  flexibility; we keep one codebase."

## The close (30 sec)

> "A third the cost. Twice the productivity. The agency customizes it themselves
> and we never touch their data to do it. Forty thousand independent agencies,
> every one underserved. There's no scenario where this loses."

## If asked

- **"Is our data isolated?"** — Yes, at the database layer. Postgres Row-Level
  Security: one agency physically cannot see or change another's data.
- **"Can we run on our own server?"** — Optional dedicated-database tier: same
  code, your own database. You never lose central security patching.
- **"How fast to switch?"** — That's the point. APIs match and migrate — no
  integration project, no downtime.
