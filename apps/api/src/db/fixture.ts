import { and, eq } from 'drizzle-orm';
import { parseArgs } from 'node:util';
import { buildNextRoundPairings, buildRoundOnePairings, type WinnerInfo } from '../lib/brackets.js';
import { generateMagicLink } from '../lib/magic-link.js';
import { WATCH_PARTY_STATUSES, type WatchPartyStatus } from '../lib/schemas.js';
import { db } from './client.js';
import {
  brackets,
  categorySuggestions,
  movieSuggestions,
  movieVotes,
  users,
  watchGroupMembers,
  watchGroups,
  watchParties,
} from './schema.js';

const MOVIE_FIXTURES = [
  { tmdbId: 603, title: 'The Matrix', releaseYear: 1999 },
  { tmdbId: 27205, title: 'Inception', releaseYear: 2010 },
  { tmdbId: 680, title: 'Pulp Fiction', releaseYear: 1994 },
  { tmdbId: 13, title: 'Forrest Gump', releaseYear: 1994 },
  { tmdbId: 155, title: 'The Dark Knight', releaseYear: 2008 },
  { tmdbId: 11, title: 'Star Wars', releaseYear: 1977 },
  { tmdbId: 76341, title: 'Mad Max: Fury Road', releaseYear: 2015 },
  { tmdbId: 19995, title: 'Avatar', releaseYear: 2009 },
  { tmdbId: 122, title: 'The Lord of the Rings: The Return of the King', releaseYear: 2003 },
  { tmdbId: 120, title: 'The Lord of the Rings: The Fellowship of the Ring', releaseYear: 2001 },
  { tmdbId: 550, title: 'Fight Club', releaseYear: 1999 },
  { tmdbId: 238, title: 'The Godfather', releaseYear: 1972 },
  { tmdbId: 278, title: 'The Shawshank Redemption', releaseYear: 1994 },
  { tmdbId: 769, title: 'GoodFellas', releaseYear: 1990 },
];

const CATEGORY_FIXTURES = [
  '90s movies',
  'Sci-fi classics',
  'Underrated gems',
  'Foreign language films',
  'Cult classics',
  'Movies under 90 minutes',
];

// ---- Args ----
const { values } = parseArgs({
  options: {
    status: { type: 'string', default: 'voting' },
    users: { type: 'string', default: '10' },
    'group-name': { type: 'string', default: 'Test Movie Night' },
  },
});

const targetStatus = values.status as WatchPartyStatus;
if (!WATCH_PARTY_STATUSES.includes(targetStatus)) {
  console.error(`Invalid --status. Must be one of: ${WATCH_PARTY_STATUSES.join(', ')}`);
  process.exit(1);
}

const userCount = Math.max(2, Math.min(20, Number.parseInt(values.users ?? '10', 10) || 10));
const groupName = values['group-name'] as string;

const targetIdx = WATCH_PARTY_STATUSES.indexOf(targetStatus);
const past = (s: WatchPartyStatus) => targetIdx >= WATCH_PARTY_STATUSES.indexOf(s);

console.log(`Generating fixture: status=${targetStatus}, users=${userCount}, group="${groupName}"`);

// ---- Users (idempotent by name) ----
const userRows: { id: string; name: string }[] = [];
for (let i = 1; i <= userCount; i++) {
  const name = `Test User ${i}`;
  let user = await db.query.users.findFirst({ where: eq(users.name, name) });
  if (!user) {
    [user] = await db.insert(users).values({ name }).returning();
  }
  userRows.push(user);
}

// ---- Group (idempotent by name) ----
let group = await db.query.watchGroups.findFirst({ where: eq(watchGroups.name, groupName) });
if (!group) {
  [group] = await db.insert(watchGroups).values({ name: groupName }).returning();
}

// ---- Members (first user is host) ----
for (let i = 0; i < userRows.length; i++) {
  await db
    .insert(watchGroupMembers)
    .values({
      groupId: group.id,
      userId: userRows[i].id,
      role: i === 0 ? 'host' : 'guest',
    })
    .onConflictDoNothing();
}

// ---- Always create a fresh party ----
const [party] = await db
  .insert(watchParties)
  .values({ watchGroupId: group.id, status: 'draft' })
  .returning();

// ---- Stage data ----

if (past('open_for_category_suggestions')) {
  await db
    .update(watchParties)
    .set({ status: 'open_for_category_suggestions' })
    .where(eq(watchParties.id, party.id));

  const cats = CATEGORY_FIXTURES.slice(0, Math.min(4, userRows.length));
  for (let i = 0; i < cats.length; i++) {
    await db.insert(categorySuggestions).values({
      watchPartyId: party.id,
      suggestedBy: userRows[i].id,
      name: cats[i],
    });
  }
}

if (past('category_suggestions_closed')) {
  await db
    .update(watchParties)
    .set({ status: 'category_suggestions_closed', selectedCategory: CATEGORY_FIXTURES[0] })
    .where(eq(watchParties.id, party.id));
}

if (past('open_for_movie_suggestions')) {
  await db
    .update(watchParties)
    .set({ status: 'open_for_movie_suggestions' })
    .where(eq(watchParties.id, party.id));

  for (let i = 0; i < userRows.length; i++) {
    const m = MOVIE_FIXTURES[i % MOVIE_FIXTURES.length];
    await db.insert(movieSuggestions).values({
      watchPartyId: party.id,
      suggestedBy: userRows[i].id,
      tmdbId: m.tmdbId,
      title: m.title,
      releaseYear: m.releaseYear,
      posterPath: null,
      overview: null,
    });
  }
}

if (past('movie_suggestions_closed')) {
  await db
    .update(watchParties)
    .set({ status: 'movie_suggestions_closed' })
    .where(eq(watchParties.id, party.id));
}

if (past('voting')) {
  await db.update(watchParties).set({ status: 'voting' }).where(eq(watchParties.id, party.id));

  const allMovies = await db.query.movieSuggestions.findMany({
    where: eq(movieSuggestions.watchPartyId, party.id),
  });
  const pairings = buildRoundOnePairings(allMovies.map((m) => m.id));
  await db.insert(brackets).values(
    pairings.map((p) => ({ watchPartyId: party.id, round: 1, ...p })),
  );

  // Mid-round vote progress for "voting" specifically (not when advancing past it)
  if (targetStatus === 'voting') {
    const round1 = await db.query.brackets.findMany({
      where: and(eq(brackets.watchPartyId, party.id), eq(brackets.round, 1)),
    });
    const partial = userRows.slice(0, Math.max(1, Math.floor(userRows.length * 0.6)));
    for (const b of round1) {
      if (b.winnerId !== null) continue; // bye
      for (const u of partial) {
        const votedFor = Math.random() < 0.5 ? b.suggestionAId : b.suggestionBId;
        await db
          .insert(movieVotes)
          .values({ bracketId: b.id, userId: u.id, votedFor })
          .onConflictDoNothing();
      }
    }
  }
}

if (past('movie_selected')) {
  let currentRound = 1;
  while (true) {
    const roundBrackets = await db.query.brackets.findMany({
      where: and(eq(brackets.watchPartyId, party.id), eq(brackets.round, currentRound)),
    });

    const winners: WinnerInfo[] = [];
    for (const b of roundBrackets) {
      if (b.winnerId !== null) {
        winners.push({ id: b.winnerId, margin: Infinity, wasBye: true });
        continue;
      }

      const votesA = Math.floor(Math.random() * (userRows.length + 1));
      for (let i = 0; i < userRows.length; i++) {
        const votedFor = i < votesA ? b.suggestionAId : b.suggestionBId;
        await db
          .insert(movieVotes)
          .values({ bracketId: b.id, userId: userRows[i].id, votedFor })
          .onConflictDoNothing();
      }

      const votesB = userRows.length - votesA;
      const winnerId = votesA >= votesB ? b.suggestionAId : b.suggestionBId;
      const margin = Math.abs(votesA - votesB);
      await db.update(brackets).set({ winnerId }).where(eq(brackets.id, b.id));
      winners.push({ id: winnerId, margin, wasBye: false });
    }

    if (winners.length === 1) {
      await db
        .update(watchParties)
        .set({ status: 'movie_selected', winningSuggestionId: winners[0].id })
        .where(eq(watchParties.id, party.id));
      break;
    }

    const nextPairings = buildNextRoundPairings(winners);
    await db.insert(brackets).values(
      nextPairings.map((p) => ({ watchPartyId: party.id, round: currentRound + 1, ...p })),
    );
    currentRound++;
  }
}

if (targetStatus === 'watched') {
  await db.update(watchParties).set({ status: 'watched' }).where(eq(watchParties.id, party.id));
}

// ---- Output ----
console.log(`\n✓ Party created: ${party.id}`);
console.log(`  Status: ${targetStatus}`);
console.log(`  Group:  ${group.name}\n`);
console.log(`Magic links (open in different browsers / incognito to test multi-user):`);
for (let i = 0; i < userRows.length; i++) {
  const u = userRows[i];
  const link = await generateMagicLink(u.id);
  const role = i === 0 ? 'host ' : 'guest';
  console.log(`  [${role}] ${u.name.padEnd(14)} ${link}`);
}

process.exit(0);
