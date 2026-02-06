-- =====================================================
-- MIGRATION: Sistema de Comentários
-- Descrição: Tabela de comentários para posts
-- =====================================================

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  text TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  time_ago TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_comments_updated_at_trigger ON comments;
CREATE TRIGGER update_comments_updated_at_trigger
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();

-- View para contar comentários por post (útil para estatísticas)
CREATE OR REPLACE VIEW comments_stats AS
SELECT 
  post_id,
  COUNT(*) FILTER (WHERE parent_comment_id IS NULL) as comments_count,
  COUNT(*) FILTER (WHERE parent_comment_id IS NOT NULL) as replies_count,
  COUNT(*) as total_count,
  SUM(likes_count) as total_likes,
  MAX(created_at) as last_comment_at
FROM comments
GROUP BY post_id;

-- Row Level Security (RLS)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
-- Permitir leitura pública
DROP POLICY IF EXISTS "Allow public read comments" ON comments;
CREATE POLICY "Allow public read comments"
  ON comments FOR SELECT
  TO public
  USING (true);

-- Permitir insert/update/delete para usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated insert comments" ON comments;
CREATE POLICY "Allow authenticated insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update comments" ON comments;
CREATE POLICY "Allow authenticated update comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete comments" ON comments;
CREATE POLICY "Allow authenticated delete comments"
  ON comments FOR DELETE
  TO authenticated
  USING (true);

-- Comentário na tabela
COMMENT ON TABLE comments IS 'Comentários e respostas dos posts do Instagram';
COMMENT ON COLUMN comments.post_id IS 'ID do post ao qual o comentário pertence';
COMMENT ON COLUMN comments.parent_comment_id IS 'ID do comentário pai (NULL se for comentário principal)';
COMMENT ON COLUMN comments.username IS 'Nome de usuário de quem fez o comentário';
COMMENT ON COLUMN comments.avatar_url IS 'URL da foto de perfil';
COMMENT ON COLUMN comments.is_verified IS 'Se a conta é verificada (badge azul)';
COMMENT ON COLUMN comments.text IS 'Texto do comentário';
COMMENT ON COLUMN comments.likes_count IS 'Número de curtidas no comentário';
COMMENT ON COLUMN comments.time_ago IS 'Tempo relativo (ex: "2 h", "1 dia")';

-- Verificação
SELECT 
  'comments' as table_name,
  COUNT(*) as total_comments
FROM comments;

SELECT * FROM comments_stats;

