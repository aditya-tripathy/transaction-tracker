import { google } from 'googleapis';

/**
 * Lists every Gmail message carrying the UNREAD label and builds a
 * sender -> count map, printed as a table sorted by volume.
 *
 * Reuses the same OAuth2 credentials as the rest of the app:
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, GMAIL_REFRESH_TOKEN
 *
 * Run with: npm run unread:map   (loads .env via --env-file)
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

if (!process.env.GMAIL_REFRESH_TOKEN) {
  console.error(
    'Missing GMAIL_REFRESH_TOKEN. Authorise the app first (visit /api/auth/gmail) and set the refresh token in .env.'
  );
  process.exit(1);
}

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

interface SenderStat {
  name: string;
  email: string;
  count: number;
}

/** Collect the ids of every UNREAD message, paging through all results. */
async function listUnreadMessageIds(): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: 'label:unread',
      maxResults: 500,
      pageToken,
    });

    for (const message of data.messages || []) {
      if (message.id) ids.push(message.id);
    }

    pageToken = data.nextPageToken || undefined;
  } while (pageToken);

  return ids;
}

/** Parse a raw From header into a normalised { name, email } pair. */
function parseFrom(rawFrom: string): { name: string; email: string } {
  const match = rawFrom.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const email = match[2].trim().toLowerCase();
    return { name: match[1].trim() || email, email };
  }
  const email = rawFrom.trim().toLowerCase();
  return { name: email, email };
}

/** Fetch the From header for one message. */
async function getSender(id: string): Promise<{ name: string; email: string } | null> {
  try {
    const { data } = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['From'],
    });

    const from = data.payload?.headers?.find((h) => h.name?.toLowerCase() === 'from');
    if (!from?.value) return null;
    return parseFrom(from.value);
  } catch (error) {
    console.error(`Failed to read message ${id}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/** Run getSender across ids in bounded-concurrency batches. */
async function buildSenderMap(ids: string[]): Promise<Map<string, SenderStat>> {
  const map = new Map<string, SenderStat>();
  const batchSize = 25;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const senders = await Promise.all(batch.map(getSender));

    for (const sender of senders) {
      if (!sender) continue;
      const existing = map.get(sender.email);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(sender.email, { ...sender, count: 1 });
      }
    }

    console.error(`Processed ${Math.min(i + batchSize, ids.length)}/${ids.length} messages...`);
  }

  return map;
}

function printTable(stats: SenderStat[], total: number): void {
  const senderWidth = Math.min(
    50,
    Math.max(6, ...stats.map((s) => `${s.name} <${s.email}>`.length))
  );

  console.log('');
  console.log(`Unread emails: ${total} from ${stats.length} senders`);
  console.log('');
  console.log(`${'COUNT'.padEnd(7)}${'SENDER'.padEnd(senderWidth)}`);
  console.log('-'.repeat(7 + senderWidth));

  for (const s of stats) {
    const label = (s.name === s.email ? s.email : `${s.name} <${s.email}>`).slice(0, senderWidth);
    console.log(`${String(s.count).padEnd(7)}${label}`);
  }
  console.log('');
}

async function main(): Promise<void> {
  console.error('Fetching UNREAD message list...');
  const ids = await listUnreadMessageIds();

  if (ids.length === 0) {
    console.log('No unread emails found.');
    return;
  }

  console.error(`Found ${ids.length} unread messages. Resolving senders...`);
  const map = await buildSenderMap(ids);

  const stats = [...map.values()].sort((a, b) => b.count - a.count || a.email.localeCompare(b.email));
  const total = stats.reduce((sum, s) => sum + s.count, 0);

  printTable(stats, total);
}

main().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
