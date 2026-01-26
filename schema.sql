-- Feedback Aggregation Tool Schema
-- Run with: wrangler d1 execute feedback-db --file=./schema.sql

DROP TABLE IF EXISTS feedback;

CREATE TABLE feedback (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,           -- e.g., 'email', 'survey', 'support_ticket', 'social'
    content TEXT NOT NULL,          -- raw feedback text
    sentiment TEXT,                 -- 'positive', 'negative', 'neutral', or null if not yet analyzed
    category TEXT,                  -- e.g., 'bug', 'feature_request', 'praise', 'complaint'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    analyzed_at TEXT                -- when AI analysis was performed
);

-- Indexes for common queries
CREATE INDEX idx_feedback_source ON feedback(source);
CREATE INDEX idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
