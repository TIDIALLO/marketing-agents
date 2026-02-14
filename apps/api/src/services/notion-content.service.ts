import { prisma } from '../lib/prisma';
import { getCalendarEntries, markAsSynced } from '../lib/notion';
import { generateContentPiece } from './content.service';
import { getNextOptimalTime } from './publishing.service';
import type { Platform } from '@synap6ia/shared';

interface SyncResult {
  created: number;
  scheduled: number;
  skipped: number;
  errors: string[];
}

const VALID_PLATFORMS: Platform[] = ['linkedin', 'twitter', 'instagram', 'facebook', 'tiktok'];

export async function syncNotionCalendar(date?: Date): Promise<SyncResult> {
  const result: SyncResult = { created: 0, scheduled: 0, skipped: 0, errors: [] };

  // 1. Fetch entries from Notion calendar
  const entries = await getCalendarEntries(date);

  if (entries.length === 0) {
    return result;
  }

  // 2. Get the default brand (single-user platform)
  const brand = await prisma.brand.findFirst();
  if (!brand) {
    result.errors.push('No brand found — cannot create content');
    return result;
  }

  // Get the admin user for createdById
  const adminUser = await prisma.platformUser.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!adminUser) {
    result.errors.push('No user found — cannot create content');
    return result;
  }

  // Get social accounts for scheduling
  const socialAccounts = await prisma.socialAccount.findMany({
    where: { brandId: brand.id, status: 'active' },
  });

  for (const entry of entries) {
    // 3. Check for duplicate via sourceUrl (Notion page URL)
    const existing = await prisma.contentInput.findFirst({
      where: { sourceUrl: entry.pageUrl },
    });

    if (existing) {
      result.skipped++;
      continue;
    }

    // 4. Create ContentInput
    const rawContent = entry.brief
      ? `Topic: ${entry.topic}\n\nBrief: ${entry.brief}`
      : entry.topic;

    let input;
    try {
      input = await prisma.contentInput.create({
        data: {
          brandId: brand.id,
          createdById: adminUser.id,
          inputType: 'notion',
          rawContent,
          sourceUrl: entry.pageUrl,
          status: 'pending',
        },
      });
      result.created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Failed to create input for "${entry.topic}": ${msg}`);
      continue;
    }

    // 5. Generate content piece for each platform listed
    const platforms = entry.platforms.filter((p): p is Platform =>
      VALID_PLATFORMS.includes(p as Platform),
    );

    if (platforms.length === 0) {
      // Default to linkedin if no platforms specified
      platforms.push('linkedin');
    }

    for (const platform of platforms) {
      try {
        const piece = await generateContentPiece(input.id, platform);

        // 6. Schedule at optimal time
        const account = socialAccounts.find((a) => a.platform === platform);
        if (account) {
          const scheduledAt = getNextOptimalTime(platform);
          await prisma.contentSchedule.create({
            data: {
              contentPieceId: piece.id,
              socialAccountId: account.id,
              scheduledAt,
              status: 'scheduled',
            },
          });

          await prisma.contentPiece.update({
            where: { id: piece.id },
            data: { status: 'scheduled' },
          });

          result.scheduled++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Failed to generate ${platform} content for "${entry.topic}": ${msg}`);
      }
    }

    // 7. Mark Notion entry as synced
    try {
      await markAsSynced(entry.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      result.errors.push(`Failed to mark Notion entry as synced: ${msg}`);
    }
  }

  return result;
}
