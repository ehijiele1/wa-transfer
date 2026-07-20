-- Social Media Publishing Tables Migration

-- Create social_media_posts table
CREATE TABLE IF NOT EXISTS social_media_posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin')),
    type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'carousel', 'link')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[], -- Array of media URLs
    hashtags TEXT[], -- Array of hashtags
    mentions TEXT[], -- Array of mentions
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- Additional platform-specific metadata
);

-- Create social_media_scheduled_posts table
CREATE TABLE IF NOT EXISTS social_media_scheduled_posts (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin')),
    content_id TEXT REFERENCES social_media_posts(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content_queues table
CREATE TABLE IF NOT EXISTS content_queues (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'all')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB -- Queue-specific metadata
);

-- Create queue_posts table (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS queue_posts (
    queue_id TEXT REFERENCES content_queues(id) ON DELETE CASCADE,
    post_id TEXT REFERENCES social_media_scheduled_posts(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (queue_id, post_id)
);

-- Create social_media_analytics table
CREATE TABLE IF NOT EXISTS social_media_analytics (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin', 'all')),
    date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_posts INTEGER DEFAULT 0,
    published_posts INTEGER DEFAULT 0,
    failed_posts INTEGER DEFAULT 0,
    total_engagement INTEGER DEFAULT 0,
    average_engagement_rate FLOAT DEFAULT 0,
    top_performing_content JSONB,
    best_posting_times TEXT[],
    audience_demographics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ab_tests table
CREATE TABLE IF NOT EXISTS ab_tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'twitter', 'linkedin')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'paused')),
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    results JSONB -- Test results and metrics
);

-- Create ab_test_variants table
CREATE TABLE IF NOT EXISTS ab_test_variants (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES ab_tests(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    audience TEXT[], -- Target audience segments
    metrics JSONB -- Performance metrics for this variant
);

-- Create social_media_performance table
CREATE TABLE IF NOT EXISTS social_media_performance (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES social_media_posts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    engagement INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    sentiment_score FLOAT DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_social_media_posts_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_created_at ON social_media_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_scheduled_at ON social_media_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_media_scheduled_posts_platform ON social_media_scheduled_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_scheduled_posts_status ON social_media_scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_media_scheduled_posts_scheduled_at ON social_media_scheduled_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_queues_platform ON content_queues(platform);
CREATE INDEX IF NOT EXISTS idx_content_queues_status ON content_queues(status);
CREATE INDEX IF NOT EXISTS idx_content_queues_priority ON content_queues(priority);
CREATE INDEX IF NOT EXISTS idx_social_media_analytics_platform ON social_media_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_analytics_date_range ON social_media_analytics(date_range_start, date_range_end);
CREATE INDEX IF NOT EXISTS idx_ab_tests_platform ON ab_tests(platform);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_social_media_performance_platform ON social_media_performance(platform);
CREATE INDEX IF NOT EXISTS idx_social_media_performance_recorded_at ON social_media_performance(recorded_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_social_media_posts_updated_at 
    BEFORE UPDATE ON social_media_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_media_scheduled_posts_updated_at 
    BEFORE UPDATE ON social_media_scheduled_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_queues_updated_at 
    BEFORE UPDATE ON content_queues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at 
    BEFORE UPDATE ON ab_tests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to get best performing content
CREATE OR REPLACE FUNCTION get_best_performing_content(
    platform TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    limit_num INTEGER DEFAULT 10
)
RETURNS TABLE (
    id TEXT,
    platform TEXT,
    title TEXT,
    engagement INTEGER,
    reach INTEGER,
    engagement_rate FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.platform,
        sp.title,
        COALESCE(smp.engagement, 0) as engagement,
        COALESCE(smp.reach, 0) as reach,
        CASE 
            WHEN COALESCE(smp.reach, 0) > 0 
            THEN COALESCE(smp.engagement, 0) / smp.reach 
            ELSE 0 
        END as engagement_rate
    FROM social_media_posts sp
    LEFT JOIN social_media_performance smp ON sp.id = smp.post_id
    WHERE sp.platform = platform
    AND sp.published_at BETWEEN start_date AND end_date
    ORDER BY 
        CASE 
            WHEN COALESCE(smp.reach, 0) > 0 
            THEN COALESCE(smp.engagement, 0) / smp.reach 
            ELSE 0 
        END DESC
    LIMIT limit_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to get audience demographics
CREATE OR NOT REPLACE FUNCTION get_audience_demographics(
    platform TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    platform TEXT,
    age_group TEXT,
    count INTEGER,
    percentage FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        platform,
        age_group,
        count,
        percentage
    FROM social_media_analytics
    WHERE platform = platform
    AND date_range_start >= start_date
    AND date_range_end <= end_date
    AND audience_demographics IS NOT NULL
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to schedule cross-platform posting
CREATE OR REPLACE FUNCTION schedule_cross_platform_post(
    content JSONB,
    platforms TEXT[],
    scheduled_at TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'medium'
)
RETURNS TABLE (
    post_id TEXT,
    platform TEXT,
    status TEXT
) AS $$
DECLARE
    queue_id TEXT;
    post_record RECORD;
BEGIN
    -- Create a queue for the platforms
    INSERT INTO content_queues (id, platform, priority, created_at)
    VALUES (gen_random_uuid()::TEXT, 'all', priority, NOW())
    RETURNING id INTO queue_id;
    
    -- Create posts for each platform
    FOREACH platform IN ARRAY platforms LOOP
        INSERT INTO social_media_posts (id, platform, type, title, content, status, scheduled_at, created_at)
        VALUES (
            gen_random_uuid()::TEXT,
            platform,
            content->>'type',
            content->>'title',
            content->>'content',
            'scheduled',
            scheduled_at,
            NOW()
        )
        RETURNING id INTO post_record.id;
        
        -- Create scheduled post entry
        INSERT INTO social_media_scheduled_posts (id, platform, content_id, scheduled_at, status, created_at)
        VALUES (
            gen_random_uuid()::TEXT,
            platform,
            post_record.id,
            scheduled_at,
            'pending',
            NOW()
        )
        RETURNING id INTO post_record.id;
        
        -- Add to queue
        INSERT INTO queue_posts (queue_id, post_id)
        VALUES (queue_id, post_record.id);
        
        -- Return the result
        RETURN NEXT;
        RETURN NEXT platform;
        RETURN NEXT 'scheduled';
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT ALL ON social_media_posts TO authenticated;
-- GRANT ALL ON social_media_scheduled_posts TO authenticated;
-- GRANT ALL ON content_queues TO authenticated;
-- GRANT ALL ON queue_posts TO authenticated;
-- GRANT ALL ON social_media_analytics TO authenticated;
-- GRANT ALL ON ab_tests TO authenticated;
-- GRANT ALL ON ab_test_variants TO authenticated;
-- GRANT ALL ON social_media_performance TO authenticated;
-- GRANT ALL ON FUNCTION get_best_performing_content(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
-- GRANT ALL ON FUNCTION get_audience_demographics(TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
-- GRANT ALL ON FUNCTION schedule_cross_platform_post(JSONB, TEXT[], TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;