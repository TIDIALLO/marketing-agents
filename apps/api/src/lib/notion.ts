import { Client } from '@notionhq/client';

const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_CALENDAR_DB_ID = process.env.NOTION_CALENDAR_DB_ID || '';

export interface NotionCalendarEntry {
  id: string;
  pageUrl: string;
  date: string;
  topic: string;
  platforms: string[];
  brief: string;
  status: string;
}

function getClient(): Client {
  if (!NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY is not configured');
  }
  return new Client({ auth: NOTION_API_KEY });
}

export async function getCalendarEntries(date?: Date): Promise<NotionCalendarEntry[]> {
  if (!NOTION_CALENDAR_DB_ID) {
    throw new Error('NOTION_CALENDAR_DB_ID is not configured');
  }

  const client = getClient();
  const targetDate = date ?? new Date();
  const dateStr = targetDate.toISOString().split('T')[0]!;

  const response = await client.databases.query({
    database_id: NOTION_CALENDAR_DB_ID,
    filter: {
      and: [
        {
          property: 'Date',
          date: { equals: dateStr },
        },
        {
          property: 'Status',
          select: { does_not_equal: 'Cancelled' },
        },
        {
          property: 'Status',
          select: { does_not_equal: 'Synced' },
        },
      ],
    },
  });

  return response.results.map((page) => {
    const p = page as Record<string, unknown>;
    const props = p.properties as Record<string, Record<string, unknown>>;

    // Extract title (Topic)
    const titleProp = props.Topic as { title?: Array<{ plain_text: string }> } | undefined;
    const topic = titleProp?.title?.[0]?.plain_text ?? '';

    // Extract date
    const dateProp = props.Date as { date?: { start: string } } | undefined;
    const entryDate: string = dateProp?.date?.start ?? dateStr;

    // Extract platforms (multi-select)
    const platformsProp = props.Platforms as { multi_select?: Array<{ name: string }> } | undefined;
    const platforms = platformsProp?.multi_select?.map((s) => s.name.toLowerCase()) ?? [];

    // Extract brief (rich text)
    const briefProp = props.Brief as { rich_text?: Array<{ plain_text: string }> } | undefined;
    const brief = briefProp?.rich_text?.map((t) => t.plain_text).join('') ?? '';

    // Extract status (select)
    const statusProp = props.Status as { select?: { name: string } } | undefined;
    const status = statusProp?.select?.name ?? 'Planned';

    return {
      id: p.id as string,
      pageUrl: (p.url as string) ?? `https://notion.so/${(p.id as string).replace(/-/g, '')}`,
      date: entryDate,
      topic,
      platforms,
      brief,
      status,
    };
  });
}

export async function markAsSynced(pageId: string): Promise<void> {
  const client = getClient();
  await client.pages.update({
    page_id: pageId,
    properties: {
      Status: {
        select: { name: 'Synced' },
      },
    },
  });
}
