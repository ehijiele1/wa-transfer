import { SupabaseClient } from '@supabase/supabase-js';
import { PropertyListing } from '../types';
import { logger } from '../utils/logger';

/**
 * Website Handoff Service
 *
 * Writes extracted WhatsApp listings into the VannieJay website's Supabase
 * project as `content_items` drafts, so the website automation (n8n / admin
 * dashboard) can review, caption, approve and publish them.
 *
 * Contracts:
 * - vj-hub/contracts/property-data.md  — the PropertyListing -> content_items mapping
 * - vj-hub/contracts/content-lifecycle.md — rows enter at status 'pending'
 *
 * Design notes:
 * - Uses the service-role client (server-side only, RLS bypass). The client is
 *   injected by SupabaseService so credentials never leave that boundary.
 * - Idempotent: unique slug `whatsapp-{id}`. A duplicate insert (Postgres 23505)
 *   means the listing was already handed off — treated as success, not an error.
 * - Never throws: WhatsApp message processing must not fail because the handoff
 *   failed. Errors are logged for inspection/retry.
 */

/** The `content_items` row shape written by the handoff. */
export interface WebsiteContentDraft {
  slug: string;
  name: string;
  kind: 'product' | 'post' | 'media-kit';
  url: string | null;
  pillar: string;
  status: 'pending';
  platforms: string[];
  image_url: string | null;
  captions: {
    description: string;
    price?: string;
    location: string;
    type: PropertyListing['type'];
    bedrooms?: number;
    bathrooms?: number;
    area?: string;
    features: string[];
    images: string[];
    provenance: {
      listing_id: string;
      source: string;
      source_group: string;
    };
  };
  created_at: string;
}

/** Content lifecycle status a WhatsApp listing enters the website pipeline with. */
export const HANDOFF_STATUS = 'pending' as const;

/** Pillar marking rows that came from WhatsApp ingestion. */
export const HANDOFF_PILLAR = 'whatsapp-ingest' as const;

/**
 * Pure mapping: PropertyListing (wa-transfer) -> content_items draft (website).
 * See vj-hub/contracts/property-data.md. Kept dependency-free for testing.
 */
export function mapPropertyToContentItem(property: PropertyListing): WebsiteContentDraft {
  // exactOptionalPropertyTypes is enabled: only set optional keys when defined.
  const captions: WebsiteContentDraft['captions'] = {
    description: property.description,
    location: property.location,
    type: property.type,
    features: property.features ?? [],
    images: property.images ?? [],
    provenance: {
      listing_id: property.id,
      source: property.source,
      source_group: property.sourceGroup,
    },
  };

  if (property.price !== undefined) captions.price = property.price;
  if (property.bedrooms !== undefined) captions.bedrooms = property.bedrooms;
  if (property.bathrooms !== undefined) captions.bathrooms = property.bathrooms;
  if (property.area !== undefined) captions.area = property.area;

  return {
    slug: `whatsapp-${property.id}`,
    name: property.title,
    kind: 'post',
    url: null,
    pillar: HANDOFF_PILLAR,
    status: HANDOFF_STATUS,
    platforms: [],
    image_url: property.images?.[0] ?? null,
    captions,
    created_at: new Date(property.timestamp).toISOString(),
  };
}

export class WebsiteHandoffService {
  constructor(private client: SupabaseClient) {}

  /**
   * Hand one property off to the website pipeline.
   * @returns true if inserted, false if already handed off / skipped.
   *          Never throws — failures are logged only.
   */
  async handoff(property: PropertyListing): Promise<boolean> {
    const draft = mapPropertyToContentItem(property);

    try {
      const { error } = await this.client
        .from('content_items')
        .insert(draft);

      if (!error) {
        logger.info('WhatsApp listing handed off to website pipeline', {
          listingId: property.id,
          slug: draft.slug,
        });
        return true;
      }

      // 23505 = unique_violation: slug already exists => already handed off.
      if (error.code === '23505') {
        logger.debug('WhatsApp listing already handed off (slug exists)', {
          listingId: property.id,
          slug: draft.slug,
        });
        return false;
      }

      // PGRST205 = table not found: website schema not reachable from here.
      if (error.code === 'PGRST205') {
        logger.warn('Website handoff skipped: content_items table not reachable — check Supabase project/env', {
          listingId: property.id,
          error: error.message,
        });
        return false;
      }

      logger.error('Failed to hand off WhatsApp listing to website pipeline', error, {
        listingId: property.id,
        slug: draft.slug,
      });
      return false;
    } catch (err) {
      logger.error('Unexpected error during website handoff', err, {
        listingId: property.id,
        slug: draft.slug,
      });
      return false;
    }
  }
}
