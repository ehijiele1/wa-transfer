import { SupabaseClient } from '@supabase/supabase-js';
import {
  WebsiteHandoffService,
  mapPropertyToContentItem,
} from '../../src/services/websiteHandoff';
import { PropertyListing } from '../../src/types';

jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const property: PropertyListing = {
  id: 'abc123',
  title: '300sqm Land, Greenland, Ibeju-Lekki',
  description: 'C of O, gatehouse, security, drainage, electricity.',
  price: '₦30,000,000',
  location: 'Greenland Estate, Ibeju-Lekki, Lagos',
  area: '300 sqm',
  type: 'land',
  features: ['C of O', 'Gated', 'Drainage'],
  images: ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'],
  source: 'whatsapp',
  sourceGroup: 'Lagos Developers Hub',
  timestamp: 1_770_000_000_000,
  processed: false,
};

/** Fake Supabase client recording the insert payload. */
function fakeClient(insertResult: { error: unknown }) {
  const insert = jest.fn().mockResolvedValue(insertResult);
  const client = { from: jest.fn(() => ({ insert })) } as unknown as SupabaseClient;
  return { client, insert };
}

describe('mapPropertyToContentItem (vj-hub contract)', () => {
  it('produces a pending whatsapp-ingest draft with provenance', () => {
    const draft = mapPropertyToContentItem(property);

    expect(draft.slug).toBe('whatsapp-abc123');
    expect(draft.status).toBe('pending');
    expect(draft.pillar).toBe('whatsapp-ingest');
    expect(draft.kind).toBe('post');
    expect(draft.platforms).toEqual([]);
    expect(draft.image_url).toBe('https://cdn.example.com/img1.jpg');
    expect(draft.captions.price).toBe('₦30,000,000');
    expect(draft.captions.type).toBe('land');
    expect(draft.captions.features).toEqual(['C of O', 'Gated', 'Drainage']);
    expect(draft.captions.provenance).toEqual({
      listing_id: 'abc123',
      source: 'whatsapp',
      source_group: 'Lagos Developers Hub',
    });
  });

  it('converts the epoch-ms timestamp to an ISO created_at', () => {
    const draft = mapPropertyToContentItem(property);
    expect(draft.created_at).toBe(new Date(1_770_000_000_000).toISOString());
  });

  it('leaves image_url null when the listing has no images', () => {
    const draft = mapPropertyToContentItem({ ...property, images: [] });
    expect(draft.image_url).toBeNull();
  });
});

describe('WebsiteHandoffService', () => {
  it('inserts the mapped draft into content_items and returns true', async () => {
    const { client, insert } = fakeClient({ error: null });
    const handedOff = await new WebsiteHandoffService(client).handoff(property);

    expect(handedOff).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toEqual(mapPropertyToContentItem(property));
  });

  it('treats a duplicate slug (23505) as already handed off, not an error', async () => {
    const { client } = fakeClient({ error: { code: '23505', message: 'duplicate key' } });
    await expect(new WebsiteHandoffService(client).handoff(property)).resolves.toBe(false);
  });

  it('skips (with warning) when content_items is not reachable (PGRST205)', async () => {
    const { client } = fakeClient({ error: { code: 'PGRST205', message: 'table not found' } });
    await expect(new WebsiteHandoffService(client).handoff(property)).resolves.toBe(false);
  });

  it('logs and swallows unexpected insert errors instead of throwing', async () => {
    const { client } = fakeClient({ error: { code: '42501', message: 'permission denied' } });
    await expect(new WebsiteHandoffService(client).handoff(property)).resolves.toBe(false);
  });

  it('swallows network-level rejections', async () => {
    const insert = jest.fn().mockRejectedValue(new Error('fetch failed'));
    const client = { from: () => ({ insert }) } as unknown as SupabaseClient;
    await expect(new WebsiteHandoffService(client).handoff(property)).resolves.toBe(false);
  });
});
