--------------- TRANSCRIPTIONS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS transcriptions (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- FILE INFO
    name TEXT NOT NULL CHECK (char_length(name) <= 500),
    audio_path TEXT NOT NULL CHECK (char_length(audio_path) <= 1000),
    file_size BIGINT NOT NULL DEFAULT 0,

    -- TRANSCRIPTION DATA
    transcript TEXT,
    language TEXT CHECK (char_length(language) <= 10),
    duration REAL, -- duration in seconds
    tokens INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    -- TRANSCRIPTION METADATA
    model TEXT CHECK (char_length(model) <= 100),
    audio_format TEXT CHECK (char_length(audio_format) <= 50),
    
    -- OPTIONAL
    description TEXT CHECK (char_length(description) <= 1000),
    transcription_id UUID -- Reference to file_items for embedding-based retrieval
);

-- INDEXES --

CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX idx_transcriptions_workspace_id ON transcriptions(workspace_id);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);

-- RLS --

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own transcriptions"
    ON transcriptions
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private transcriptions"
    ON transcriptions
    FOR SELECT
    USING (status = 'completed' AND EXISTS (
        SELECT 1 FROM workspaces WHERE id = transcriptions.workspace_id AND sharing <> 'private'
    ));

-- TRIGGERS --

CREATE TRIGGER update_transcriptions_updated_at
BEFORE UPDATE ON transcriptions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();





