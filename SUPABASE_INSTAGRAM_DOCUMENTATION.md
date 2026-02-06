# Documentação Completa - Supabase Instagram Clone

## 📋 Informações do Projeto

### Detalhes Gerais
- **Nome do Projeto**: Clone Insta
- **ID do Projeto**: `izuspwvgvozwdjzbrpvt`
- **Referência**: `izuspwvgvozwdjzbrpvt`
- **Organização ID**: `adsruqayqckschiycikl`
- **Região**: `sa-east-1` (São Paulo, Brasil)
- **Status**: `ACTIVE_HEALTHY`
- **Data de Criação**: 2025-11-05T00:12:59.906465Z

### Banco de Dados
- **Host**: `db.izuspwvgvozwdjzbrpvt.supabase.co`
- **Versão PostgreSQL**: `17.6.1.037`
- **Engine PostgreSQL**: `17`
- **Release Channel**: `ga` (General Availability)

### URLs e Chaves
- **URL da API**: `https://izuspwvgvozwdjzbrpvt.supabase.co`
- **Chave Pública (Anon)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dXNwd3Zndm96d2RqemJycHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDE1NzksImV4cCI6MjA3Nzg3NzU3OX0.0ktkBb-_OnYhqIdDcj15UQxIsArT6ZIU2oFnAHITRuo`
- **Tipo**: Legacy anon API key (JWT-based)

---

## 📊 Estrutura do Banco de Dados

### Tabelas

#### 1. `profile_settings`
**Descrição**: Armazena as configurações e informações do perfil do Instagram.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `username` (text, UNIQUE) - Nome de usuário único
- `name` (text) - Nome completo do perfil
- `avatar_url` (text, nullable) - URL do avatar
- `bio` (text[], default: '{}') - Biografia em formato de array
- `link` (text, nullable) - Link externo do perfil
- `followers_count` (integer, default: 0) - Contador de seguidores
- `following_count` (integer, default: 0) - Contador de seguindo
- `posts_count` (integer, default: 0) - Contador de posts
- `is_active` (boolean, default: false) - Status de ativação
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 1
**Chaves Estrangeiras**:
- Referenciada por: `posts.profile_username`, `profile_follows.profile_username`, `stories.profile_username`

---

#### 2. `posts`
**Descrição**: Armazena os posts do Instagram.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `profile_username` (text) - Username do perfil (FK → profile_settings.username)
- `images` (text[], default: '{}') - Array de URLs de imagens
- `likes_count` (integer, default: 0) - Contador de curtidas
- `comments_count` (integer, default: 0) - Contador de comentários
- `caption` (text, default: '') - Legenda do post
- `post_date` (text, nullable) - Data do post
- `order_index` (integer, default: 0) - Índice de ordenação
- `is_active` (boolean, default: true) - Status de ativação
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 3
**Chaves Estrangeiras**:
- Referencia: `profile_settings.username`
- Referenciada por: `comments.post_id`, `post_likes.post_id`

---

#### 3. `stories`
**Descrição**: Armazena os stories do Instagram.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `profile_username` (text) - Username do perfil (FK → profile_settings.username)
- `media_url` (text) - URL da mídia (imagem ou vídeo)
- `media_type` (text) - Tipo de mídia: 'image' ou 'video' (CHECK constraint)
- `thumbnail` (text, nullable) - URL da miniatura
- `duration` (integer, default: 5000) - Duração em milissegundos
- `order_index` (integer, default: 0) - Índice de ordenação
- `is_active` (boolean, default: true) - Status de ativação
- `show_link` (boolean, default: false) - Indica se o botão de link deve ser exibido
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 24
**Chaves Estrangeiras**:
- Referencia: `profile_settings.username`
- Referenciada por: `story_likes.story_id`, `story_views.story_id`

---

#### 4. `profile_follows`
**Descrição**: Gerencia os relacionamentos de seguir/seguido.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `visitor_id` (text) - ID do visitante/usuário
- `profile_username` (text) - Username do perfil seguido (FK → profile_settings.username)
- `is_following` (boolean, default: true) - Status de seguindo
- `followed_at` (timestamptz, default: now()) - Data que começou a seguir
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 12
**Chaves Estrangeiras**:
- Referencia: `profile_settings.username`

---

#### 5. `post_likes`
**Descrição**: Armazena as curtidas dos posts.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `visitor_id` (text) - ID do visitante que curtiu
- `post_id` (text) - ID do post (FK → posts.id)
- `is_liked` (boolean, default: true) - Status de curtida
- `liked_at` (timestamptz, default: now()) - Data da curtida
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 4
**Chaves Estrangeiras**:
- Referencia: `posts.id`

---

#### 6. `story_likes`
**Descrição**: Armazena as curtidas dos stories.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `visitor_id` (text) - ID do visitante que curtiu
- `story_id` (uuid) - ID do story (FK → stories.id)
- `is_liked` (boolean, default: true) - Status de curtida
- `liked_at` (timestamptz, default: now()) - Data da curtida
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 2
**Chaves Estrangeiras**:
- Referencia: `stories.id`

---

#### 7. `conversations`
**Descrição**: Gerencia as conversas de mensagens diretas.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `visitor_id` (text, UNIQUE) - ID único do visitante
- `visitor_name` (text, default: 'Visitante') - Nome do visitante
- `last_message_at` (timestamptz, default: now()) - Data da última mensagem
- `unread_count` (integer, default: 0) - Contador de mensagens não lidas
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 5
**Chaves Estrangeiras**:
- Referenciada por: `messages.conversation_id`

---

#### 8. `messages`
**Descrição**: Armazena as mensagens das conversas.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `conversation_id` (uuid) - ID da conversa (FK → conversations.id)
- `content` (text, default: '') - Conteúdo da mensagem
- `is_from_admin` (boolean, default: false) - Indica se é do admin
- `read` (boolean, default: false) - Status de leitura
- `media_url` (text, nullable) - URL da mídia anexada
- `media_type` (text, nullable) - Tipo de mídia: 'image', 'video', 'audio', 'document' (CHECK constraint)
- `media_thumbnail` (text, nullable) - Miniatura da mídia
- `media_duration` (integer, nullable) - Duração da mídia
- `replied_to_story_media_url` (text, nullable) - URL da mídia do story respondido
- `replied_to_story_media_type` (text, nullable) - Tipo de mídia do story respondido
- `replied_to_story_id` (uuid, nullable) - ID do story respondido (FK → stories.id)
- `replied_to_story_thumbnail` (text, nullable) - Miniatura do story respondido
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 10
**Chaves Estrangeiras**:
- Referencia: `conversations.id`, `stories.id` (via `replied_to_story_id`)

---

#### 9. `comments`
**Descrição**: Armazena os comentários dos posts.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `post_id` (text) - ID do post (FK → posts.id)
- `parent_comment_id` (uuid, nullable) - ID do comentário pai (FK → comments.id) - permite respostas
- `username` (text) - Nome de usuário do comentador
- `avatar_url` (text, nullable) - URL do avatar do comentador
- `is_verified` (boolean, default: false) - Status de verificação
- `text` (text) - Texto do comentário
- `image_url` (text, nullable) - URL da imagem anexada ao comentário (opcional)
- `likes_count` (integer, default: 0) - Contador de curtidas
- `time_ago` (text) - Tempo relativo
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 28
**Chaves Estrangeiras**:
- Referencia: `posts.id`, `comments.id` (self-reference para respostas)

**Nota**: A tabela `comments` possui um campo adicional `image_url` (text, nullable) que permite anexar imagens aos comentários. O campo `post_id` é do tipo `text` no banco de dados.

---

#### 10. `story_views`
**Descrição**: Armazena informações detalhadas sobre visualizações dos stories, incluindo analytics avançados.

**Colunas**:
- `id` (uuid, PK) - Identificador único
- `story_id` (uuid) - ID do story (FK → stories.id)
- `visitor_id` (text) - ID do visitante
- `ip_address` (text, nullable) - Endereço IP
- `country` (text, nullable) - País
- `city` (text, nullable) - Cidade
- `region` (text, nullable) - Região
- `latitude` (double precision, nullable) - Latitude
- `longitude` (double precision, nullable) - Longitude
- `isp` (text, nullable) - Provedor de internet
- `device_type` (text, nullable) - Tipo de dispositivo
- `device_model` (text, nullable) - Modelo do dispositivo
- `device_vendor` (text, nullable) - Fabricante do dispositivo
- `browser` (text, nullable) - Navegador
- `browser_version` (text, nullable) - Versão do navegador
- `os` (text, nullable) - Sistema operacional
- `os_version` (text, nullable) - Versão do SO
- `user_agent` (text, nullable) - User agent completo
- `fingerprint` (text) - Fingerprint único do visitante
- `canvas_fingerprint` (text, nullable) - Fingerprint do canvas
- `webgl_fingerprint` (text, nullable) - Fingerprint do WebGL
- `audio_fingerprint` (text, nullable) - Fingerprint de áudio
- `fonts_fingerprint` (text, nullable) - Fingerprint de fontes
- `screen_resolution` (text, nullable) - Resolução da tela
- `screen_color_depth` (integer, nullable) - Profundidade de cor
- `pixel_ratio` (double precision, nullable) - Razão de pixels
- `timezone` (text, nullable) - Fuso horário
- `language` (text, nullable) - Idioma
- `languages` (text[], nullable) - Array de idiomas
- `viewed_at` (timestamptz, default: now()) - Data/hora da visualização
- `session_id` (uuid, nullable, default: gen_random_uuid()) - ID da sessão
- `session_count` (integer, default: 1) - Contador de sessões
- `watch_time_ms` (integer, default: 0) - Tempo assistido em milissegundos
- `viewed_percentage` (numeric, default: 0) - Percentual visualizado
- `completed` (boolean, default: false) - Se completou a visualização
- `first_viewed_at` (timestamptz, nullable, default: now()) - Primeira visualização
- `last_viewed_at` (timestamptz, nullable, default: now()) - Última visualização
- `exit_reason` (text, nullable) - Motivo da saída
- `playback_events` (jsonb, default: '[]') - Eventos de reprodução em JSON
- `created_at` (timestamptz, default: now()) - Data de criação
- `updated_at` (timestamptz, default: now()) - Data de atualização

**RLS**: Habilitado
**Linhas**: 47
**Chaves Estrangeiras**:
- Referencia: `stories.id`

---

## 🔍 Views

### 1. `comments_stats`
**Descrição**: View agregada com estatísticas de comentários por post.

**Colunas**:
- `post_id` - ID do post
- `comments_count` - Número de comentários principais (sem parent)
- `replies_count` - Número de respostas (com parent)
- `total_count` - Total de comentários
- `total_likes` - Soma total de curtidas
- `last_comment_at` - Data do último comentário

**Definição SQL**:
```sql
SELECT post_id,
    count(*) FILTER (WHERE (parent_comment_id IS NULL)) AS comments_count,
    count(*) FILTER (WHERE (parent_comment_id IS NOT NULL)) AS replies_count,
    count(*) AS total_count,
    sum(likes_count) AS total_likes,
    max(created_at) AS last_comment_at
FROM comments
GROUP BY post_id;
```

**⚠️ Aviso de Segurança**: Esta view está definida com `SECURITY DEFINER`, o que pode ser um risco de segurança.

---

### 2. `story_view_stats`
**Descrição**: View agregada com estatísticas detalhadas de visualizações dos stories.

**Colunas**:
- `story_id` - ID do story
- `unique_views` - Visualizações únicas (por fingerprint)
- `total_views` - Total de visualizações (soma de session_count)
- `unique_ips` - IPs únicos
- `unique_visitors` - Visitantes únicos
- `countries_count` - Número de países distintos
- `cities_count` - Número de cidades distintas
- `device_types_count` - Número de tipos de dispositivos distintos
- `last_viewed_at` - Última visualização
- `first_viewed_at` - Primeira visualização
- `views_last_24h` - Visualizações nas últimas 24 horas
- `completed_views` - Visualizações completas
- `completion_rate_percentage` - Taxa de conclusão em percentual
- `avg_watch_time_ms` - Tempo médio assistido em ms
- `avg_viewed_percentage` - Percentual médio visualizado
- `total_watch_time_ms` - Tempo total assistido em ms

**Definição SQL**:
```sql
SELECT 
    story_id,
    count(DISTINCT fingerprint) AS unique_views,
    sum(session_count) AS total_views,
    count(DISTINCT ip_address) AS unique_ips,
    count(DISTINCT visitor_id) AS unique_visitors,
    count(DISTINCT country) AS countries_count,
    count(DISTINCT city) AS cities_count,
    count(DISTINCT device_type) AS device_types_count,
    max(last_viewed_at) AS last_viewed_at,
    min(first_viewed_at) AS first_viewed_at,
    sum(session_count) FILTER (
        WHERE last_viewed_at >= (timezone('utc'::text, now()) - '24:00:00'::interval)
    ) AS views_last_24h,
    sum(
        CASE
            WHEN completed THEN session_count
            ELSE 0
        END
    ) AS completed_views,
    CASE
        WHEN sum(session_count) > 0 THEN 
            round(
                ((sum(
                    CASE
                        WHEN completed THEN session_count
                        ELSE 0
                    END
                )::numeric / sum(session_count)::numeric) * 100::numeric), 
                2
            )
        ELSE 0::numeric
    END AS completion_rate_percentage,
    round(avg(watch_time_ms), 2) AS avg_watch_time_ms,
    round(avg(viewed_percentage), 2) AS avg_viewed_percentage,
    sum(watch_time_ms) AS total_watch_time_ms
FROM story_views
GROUP BY story_id;
```

**⚠️ Aviso de Segurança**: Esta view está definida com `SECURITY DEFINER`, o que pode ser um risco de segurança.

---

## ⚙️ Funções

### 1. `set_updated_at()`
**Descrição**: Função trigger que atualiza automaticamente o campo `updated_at` quando um registro é modificado.

**Tipo**: Trigger Function
**Linguagem**: PL/pgSQL

**Definição**:
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$function$
```

**⚠️ Aviso de Segurança**: Esta função tem `search_path` mutável, o que pode ser um risco de segurança.

---

### 2. `update_conversation_on_message()`
**Descrição**: Função trigger que atualiza a conversa quando uma nova mensagem é inserida.

**Tipo**: Trigger Function
**Linguagem**: PL/pgSQL

**Funcionalidade**:
- Atualiza `last_message_at` com a data da nova mensagem
- Atualiza `updated_at` da conversa
- Incrementa `unread_count` se a mensagem não for do admin, caso contrário zera

**Definição**:
```sql
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = timezone('utc', now()),
    unread_count = CASE WHEN NEW.is_from_admin THEN 0 ELSE unread_count + 1 END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
```

**⚠️ Aviso de Segurança**: Esta função tem `search_path` mutável, o que pode ser um risco de segurança.

---

## 🔐 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. As políticas seguem um padrão de acesso público:

### Políticas por Tabela

#### Tabelas com Políticas "Public mutate" e "Public read"
- `comments`
- `conversations`
- `messages`
- `post_likes`
- `posts`
- `profile_follows`
- `profile_settings`
- `stories`
- `story_likes`

**Políticas**:
- **Public mutate [tabela]**: Permite todas as operações (SELECT, INSERT, UPDATE, DELETE) para role `public`
- **Public read [tabela]**: Permite apenas SELECT para role `public`

#### Tabela `story_views` com Políticas Específicas
- **Public read story_views**: SELECT para role `public`
- **Public insert story_views**: INSERT para role `public`
- **Public update story_views**: UPDATE para role `public`
- **Public delete story_views**: DELETE para role `public`

**⚠️ Aviso de Performance**: Múltiplas políticas permissivas na mesma tabela podem impactar a performance, pois cada política deve ser executada para cada query relevante.

---

## 📦 Extensões Instaladas

### Extensões Ativas
1. **plpgsql** (v1.0) - Linguagem procedural PL/pgSQL
2. **uuid-ossp** (v1.1) - Geração de UUIDs
3. **pgcrypto** (v1.3) - Funções criptográficas
4. **pg_stat_statements** (v1.11) - Estatísticas de execução de SQL
5. **supabase_vault** (v0.3.1) - Supabase Vault Extension
6. **pg_graphql** (v1.5.11) - Suporte GraphQL

### Extensões Disponíveis (não instaladas)
- PostGIS (geolocalização)
- pg_cron (agendamento de tarefas)
- pg_net (HTTP assíncrono)
- vector (vetores para IA)
- E muitas outras...

---

## 📝 Migrações

### Lista de Migrações Aplicadas

1. **create_chat_system** (20251105024113)
   - Criação do sistema de chat

2. **add_media_support_to_messages** (20251105031305)
   - Adição de suporte a mídia nas mensagens

3. **create_stories_table** (20251105055826)
   - Criação da tabela de stories

4. **create_likes_tables** (20251105150350)
   - Criação das tabelas de likes

5. **create_profile_settings_and_posts** (20251105174148)
   - Criação das tabelas de perfil e posts

6. **add_story_reply_fields_to_messages** (20251106035233)
   - Adição de campos para resposta a stories nas mensagens

7. **add_thumbnail_to_stories** (20251106035355)
   - Adição de thumbnail aos stories

8. **create_story_views_table** (20251107165346)
   - Criação da tabela de visualizações de stories

9. **create_comments_table_with_image_support** (20251107235541)
   - Criação da tabela de comentários com suporte a imagens

10. **add_missing_fields_to_align_with_documentation** (aplicada)
    - Adição de campos faltantes em `story_views` (session_id, session_count, watch_time_ms, viewed_percentage, completed, first_viewed_at, last_viewed_at, exit_reason, playback_events)
    - Adição de campo `show_link` na tabela `stories`
    - Adição de campo `comments_count` na tabela `posts`

11. **update_story_view_stats_view** (aplicada)
    - Atualização da view `story_view_stats` para incluir todos os campos de analytics

12. **create_set_updated_at_function** (aplicada)
    - Criação da função `set_updated_at()` conforme documentação

13. **create_update_conversation_on_message_function** (aplicada)
    - Criação da função `update_conversation_on_message()` conforme documentação

---

## 🚀 Edge Functions

**Nenhuma Edge Function configurada no momento.**

---

## ⚠️ Advisories (Recomendações)

### Segurança

#### 🔴 ERRO: Security Definer Views
- **View**: `story_view_stats`
  - **Problema**: View definida com `SECURITY DEFINER` pode ser um risco de segurança
  - **Remediação**: [Link](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

- **View**: `comments_stats`
  - **Problema**: View definida com `SECURITY DEFINER` pode ser um risco de segurança
  - **Remediação**: [Link](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)

#### 🟡 AVISO: Function Search Path Mutable
As seguintes funções têm `search_path` mutável, mas agora foram configuradas com `SET search_path = public`:
- **Função**: `set_updated_at`
  - **Status**: Configurada com `SET search_path = public`
  - **Remediação**: [Link](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

- **Função**: `update_conversation_on_message`
  - **Status**: Configurada com `SET search_path = public`
  - **Remediação**: [Link](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)

**Nota**: O banco de dados também possui outras funções similares para atualização de timestamps:
- `handle_updated_at()`
- `update_updated_at_column()`
- `update_comments_updated_at()`
- `update_story_views_updated_at()`
- `update_conversation_last_message()`

### Performance

#### 🟡 AVISO: Multiple Permissive Policies
Múltiplas políticas permissivas nas seguintes tabelas podem impactar performance:
- `comments`
- `conversations`
- `messages`
- `post_likes`
- `posts`
- `profile_follows`
- `profile_settings`
- `stories`
- `story_likes`

**Problema**: Múltiplas políticas permissivas para a mesma role e ação (ex: SELECT) são subótimas para performance, pois cada política deve ser executada para cada query relevante.

**Remediação**: [Link](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)

#### ℹ️ INFO: Unused Indexes
Os seguintes índices não estão sendo utilizados e podem ser candidatos para remoção:
- `idx_stories_profile_username` na tabela `stories`
- `idx_stories_is_active` na tabela `stories`
- `idx_profile_follows_visitor` na tabela `profile_follows`
- `idx_posts_profile_username` na tabela `posts`
- `idx_posts_is_active` na tabela `posts`
- `idx_posts_order_index` na tabela `posts`
- `idx_comments_created_at` na tabela `comments`
- `idx_story_views_visitor_id` na tabela `story_views`
- `idx_story_views_ip_address` na tabela `story_views`
- `idx_story_views_viewed_at` na tabela `story_views`
- `idx_messages_created_at` na tabela `messages`
- `idx_messages_story_id` na tabela `messages`

#### ℹ️ INFO: Unindexed Foreign Keys
- `story_likes_story_id_fkey` na tabela `story_likes` sem índice cobrindo

**Remediação**: [Link](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

---

## 📊 Estatísticas de Dados

### Contagem de Registros por Tabela
- `profile_settings`: 1 registro
- `posts`: 3 registros
- `stories`: 24 registros
- `profile_follows`: 12 registros
- `post_likes`: 4 registros
- `story_likes`: 2 registros
- `conversations`: 5 registros
- `messages`: 10 registros
- `comments`: 28 registros
- `story_views`: 47 registros

---

## 🔗 Relacionamentos entre Tabelas

### Diagrama de Relacionamentos

```
profile_settings (username)
    ├── posts (profile_username)
    ├── stories (profile_username)
    └── profile_follows (profile_username)

posts (id)
    ├── comments (post_id)
    └── post_likes (post_id)

stories (id)
    ├── story_likes (story_id)
    └── story_views (story_id)

conversations (id)
    └── messages (conversation_id)

comments (id)
    └── comments (parent_comment_id) [self-reference]
```

---

## 📋 Tipos TypeScript

O Supabase gera automaticamente tipos TypeScript para todas as tabelas. Os tipos incluem:
- `Row` - Tipo para leitura de dados
- `Insert` - Tipo para inserção de dados
- `Update` - Tipo para atualização de dados
- `Relationships` - Relacionamentos entre tabelas

**Versão PostgREST**: 13.0.5

---

## 🎯 Funcionalidades Principais

### 1. Gerenciamento de Perfil
- Configurações de perfil (username, nome, bio, avatar)
- Contadores de seguidores, seguindo e posts
- Link externo do perfil

### 2. Posts
- Múltiplas imagens por post
- Sistema de curtidas
- Sistema de comentários com respostas (threads)
- Legenda e data do post
- Ordenação por índice

### 3. Stories
- Suporte para imagens e vídeos
- Duração configurável
- Sistema de curtidas
- Analytics detalhados de visualizações
- Botão de link opcional

### 4. Sistema de Seguir
- Relacionamento de seguir/seguido
- Contadores automáticos

### 5. Mensagens Diretas
- Sistema de conversas
- Mensagens com mídia (imagem, vídeo, áudio, documento)
- Respostas a stories
- Contador de não lidas
- Atualização automática da conversa

### 6. Analytics de Stories
- Tracking detalhado de visualizações
- Informações geográficas (país, cidade, região)
- Informações de dispositivo e navegador
- Fingerprinting avançado
- Métricas de engajamento (tempo assistido, percentual visualizado)
- Eventos de reprodução

---

## 🔧 Configurações e Boas Práticas

### Timestamps Automáticos
- Todas as tabelas têm `created_at` e `updated_at` com valores padrão
- Função `set_updated_at()` atualiza automaticamente `updated_at` via triggers

### UUIDs
- Todas as chaves primárias usam UUID (gen_random_uuid())
- Extensão `uuid-ossp` instalada para suporte

### Row Level Security
- RLS habilitado em todas as tabelas
- Políticas públicas configuradas para acesso geral

### Realtime
- Realtime habilitado para chat (migração específica)

---

## 📌 Notas Importantes

1. **Segurança**: As views `comments_stats` e `story_view_stats` usam `SECURITY DEFINER`, o que pode ser um risco. Considere revisar.

2. **Performance**: Múltiplas políticas RLS permissivas podem impactar performance. Considere consolidar.

3. **Índices Não Utilizados**: Vários índices não estão sendo usados. Avalie se devem ser removidos ou se as queries precisam ser otimizadas.

4. **Analytics Avançados**: A tabela `story_views` possui um sistema robusto de analytics com fingerprinting e tracking detalhado.

5. **Sistema de Mensagens**: O sistema de mensagens suporta respostas a stories, permitindo interação direta com o conteúdo.

---

## 📅 Última Atualização

**Data da Documentação**: 2025-01-27
**Versão do Banco**: PostgreSQL 17.6.1.037
**Status do Projeto**: ACTIVE_HEALTHY
**Última Sincronização**: Banco de dados alinhado com documentação completa

---

*Documentação gerada automaticamente via MCP Supabase*

