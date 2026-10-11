"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteHandoffService = exports.HANDOFF_PILLAR = exports.HANDOFF_STATUS = void 0;
exports.mapPropertyToContentItem = mapPropertyToContentItem;
const logger_1 = require("../utils/logger");
exports.HANDOFF_STATUS = 'pending';
exports.HANDOFF_PILLAR = 'whatsapp-ingest';
function mapPropertyToContentItem(property) {
    const captions = {
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
    if (property.price !== undefined)
        captions.price = property.price;
    if (property.bedrooms !== undefined)
        captions.bedrooms = property.bedrooms;
    if (property.bathrooms !== undefined)
        captions.bathrooms = property.bathrooms;
    if (property.area !== undefined)
        captions.area = property.area;
    return {
        slug: `whatsapp-${property.id}`,
        name: property.title,
        kind: 'post',
        url: null,
        pillar: exports.HANDOFF_PILLAR,
        status: exports.HANDOFF_STATUS,
        platforms: [],
        image_url: property.images?.[0] ?? null,
        captions,
        created_at: new Date(property.timestamp).toISOString(),
    };
}
class WebsiteHandoffService {
    client;
    constructor(client) {
        this.client = client;
    }
    async handoff(property) {
        const draft = mapPropertyToContentItem(property);
        try {
            const { error } = await this.client
                .from('content_items')
                .insert(draft);
            if (!error) {
                logger_1.logger.info('WhatsApp listing handed off to website pipeline', {
                    listingId: property.id,
                    slug: draft.slug,
                });
                return true;
            }
            if (error.code === '23505') {
                logger_1.logger.debug('WhatsApp listing already handed off (slug exists)', {
                    listingId: property.id,
                    slug: draft.slug,
                });
                return false;
            }
            if (error.code === 'PGRST205') {
                logger_1.logger.warn('Website handoff skipped: content_items table not reachable — check Supabase project/env', {
                    listingId: property.id,
                    error: error.message,
                });
                return false;
            }
            logger_1.logger.error('Failed to hand off WhatsApp listing to website pipeline', error, {
                listingId: property.id,
                slug: draft.slug,
            });
            return false;
        }
        catch (err) {
            logger_1.logger.error('Unexpected error during website handoff', err, {
                listingId: property.id,
                slug: draft.slug,
            });
            return false;
        }
    }
}
exports.WebsiteHandoffService = WebsiteHandoffService;
//# sourceMappingURL=websiteHandoff.js.map