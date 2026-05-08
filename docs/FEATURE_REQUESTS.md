# Feature Requests

## Implementation Plan

**Suggested order:**

- [x] 3 — Only show own movie suggestion (quick win, no deps)
- [ ] 1 — Clickable detail view + bracket graphic + category history
- [ ] 5 — Host vote breakdowns
- [ ] 4 — Category spinner
- [ ] 2 — Round auto-advance timer
- [ ] 6 — Does the dog die

---

## 1. Clickable party cards / detail view — Medium

- Add a guest-accessible `/party/$partyId` route (distinct from the host `/parties/$partyId` management screen)
- Show all category suggestions regardless of current status (read-only list)
- Show a traditional tournament bracket graphic (visual bracket tree, not just vertical rounds) — persists after voting ends

## 2. Round auto-advance timer — Medium-High

- Add `roundEndsAt` column to the brackets table (migration needed)
- Host sets a deadline when advancing to voting or closing a round
- Backend: `setTimeout`-based scheduler that calls close-round when the timer fires; needs to survive restarts (persist deadline to DB)
- Frontend: countdown display, host UI to set the duration

## 3. Only show own movie suggestion — Trivial (FE only)

- Hide other users' movie suggestions, show a count instead ("3 others have suggested")
- Category suggestions stay fully visible (already the case)

## 4. Category spinner — High

- Backend: `POST /parties/:partyId/category-spin` — picks winner, persists it, broadcasts `{ type: "category_spin", winner, suggestions }` over WS before advancing
- Frontend: animated spinner wheel component driven by WS event; all clients spin simultaneously and land on the pre-determined winner
- Host button triggers the spin instead of the current dropdown

## 5. Host vote breakdowns — Medium

- Backend: new endpoint `GET /parties/:partyId/brackets/:bracketId/votes` returning per-user votes
- Frontend: expandable section on each resolved bracket showing who voted for which movie (host-only)

## 6. Does the dog die content warnings — Medium

- Backend: proxy endpoint `GET /content-warnings?title=` forwarding to the doesthedogdie.com API
- Frontend: show warning icons/tags on movie suggestion items, expandable list of warnings
