## Infraestrutura Supabase

- **Projeto ativo**: `izuspwvgvozwdjzbrpvt`  
  URL base da API: `https://izuspwvgvozwdjzbrpvt.supabase.co`
- **Autenticacao**: a aplicacao roda inteiramente com a chave `anon`. Nao ha usuarios autenticados; as politicas de RLS concedem acesso total ao publico.
- **Chave publica atual**: ver `src/lib/supabase.ts`. Sempre que rotacionar a chave, atualize esse arquivo.

## Esquema principal (`public`)

| Tabela                       | Objetivo                                           | Observacoes                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile_settings`           | Metadados do perfil principal exibido no app       | Apenas um registro ativo (`is_active = true`). Trigger `set_updated_at`.                                                                                                                        |
| `posts`                      | Posts do feed (galeria)                            | Campo `images` (ARRAY de `TEXT`), ordenacao por `order_index`.                                                                                                                                  |
| `stories`                    | Stories exibidos aos visitantes                    | Suporta imagens e videos. Trigger `set_updated_at`.                                                                                                                                             |
| `profile_follows`            | Estado de follow por visitante                     | Constrangimento unico (`visitor_id`, `profile_username`).                                                                                                                                       |
| `post_likes` / `story_likes` | Curtidas por visitante                             | Constrangimento unico com visitante.                                                                                                                                                            |
| `conversations`              | Conversas iniciadas via chat                       | Campo `visitor_id` unico.                                                                                                                                                                       |
| `messages`                   | Mensagens do chat visitante ↔ admin                | Trigger `update_conversation_on_message` mantem `last_message_at` e `unread_count`.                                                                                                             |
| `comments`                   | Comentarios em posts com hierarquia                | `parent_comment_id` suporta aninhamento.                                                                                                                                                        |
| `highlights`                 | Grupos de destaques do perfil                      | Metadata (nome, capa, ordem).                                                                                                                                                                   |
| `highlight_stories`          | Relacao entre destaque e story                     | Ordenacao customizada dentro do destaque.                                                                                                                                                       |
| `story_views`                | Rastreamento detalhado de visualizacoes de stories | `fingerprint` + `session_id` garantem unicidade por visitante/story; armazena metrica de sessao (`session_count`, `watch_time_ms`, `viewed_percentage`, `completed`) e fingerprinting completo. |

### Views

- `comments_stats`: contagem agregada de comentarios/respostas por post.
- `story_view_stats`: metricas agregadas de visualizacoes (`total_views`, `unique_views`, `views_last_24h`, `completed_views`, `avg_watch_time_ms`, `avg_viewed_percentage`, entre outras).

Ambas tem `GRANT SELECT` para `anon` e `authenticated`.

## Buckets de Storage

| Bucket          | Uso                                                         | Observacoes                                                                |
| --------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `profile-media` | Fotos de perfil, posts e arquivos JSON estaticos            | Policies permitem leitura/escrita publica (aplicacao roda com chave anon). |
| `stories-media` | Midia dos stories                                           | Idem.                                                                      |
| `chat-media`    | Anexos enviados no chat                                     | Idem.                                                                      |
| `avatars`       | Avatares enviados manualmente no gerenciador de comentarios | Idem.                                                                      |

As policies criadas em `storage.objects` liberam `SELECT/INSERT/UPDATE/DELETE` para `bucket_id` correspondente. Se for necessario restringir acesso no futuro, criar policies especificas por role.

## Dados de seed

Rodamos a migration `20241110_seed_core_data` (emitida via MCP) que insere:

- Perfil `pedroomonteeiroo__`.
- Tres posts (`id` fixos `1111...`, `2222...`, `3333...`) com legendas e imagens de `/assets`.
- Tres stories (`id` `4444...`, `5555...`, `6666...`) utilizando as imagens locais.
- Conjunto de comentarios replicando os mocks (`comments` + replies).

> Sempre que os conteudos forem atualizados via painel admin, considere regenerar os arquivos estaticos (`ProfileService.generateStaticFiles`) para manter o carregamento instantaneo.

## Policies e RLS

- Todas as tabelas listadas tem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Policies padrao dao acesso total ao `public` (ou seja, `anon` e `authenticated`). Isso e deliberado porque o painel admin tambem usa a mesma chave.
- Se for necessario reforcar seguranca, a abordagem recomendada e introduzir autenticacao (service role em backend ou Supabase Auth) e ajustar as policies.

## Triggers e Funcoes

- `public.set_updated_at`: reaproveitado por quase todas as tabelas (incluindo `highlights`) para manter `updated_at`.
- `public.update_conversation_on_message`: executado `AFTER INSERT` em `messages` para atualizar metadados da conversa.
- `update_story_views_updated_at`: mantem consistencia de timestamps em `story_views`.

## Realtime

- Publicacao `supabase_realtime` inclui `public.messages` e `public.conversations` (migration `20241110_enable_realtime_chat`).
- Ambas as tabelas estao com `REPLICA IDENTITY FULL` para garantir payload completo em eventos `postgres_changes`.
- Os canais do front (visitante e admin) escutam inserts/updates diretamente dessas tabelas; com a publicacao habilitada as mensagens chegam em tempo real sem recarregar a pagina.

## Scripts auxiliares

- `supabase_migration_comments.sql`: tabela e view de comentarios (mantida para referencia/manual).
- `supabase_migration_story_views.sql`: atualizado para refletir exatamente o schema implantado (inclui policies e indices).
- `supabase_migration_story_views_precision.sql`: amplia `story_views` com campos de sessao, indices e policy de update publico.
- `20241110_profile_username_cascade`: garante `ON UPDATE CASCADE` em `posts`, `stories` e `profile_follows`, permitindo renomear o username do perfil sem falhas de FK.

> Sempre execute os scripts via editor SQL apontando para `https://supabase.com/dashboard/project/izuspwvgvozwdjzbrpvt/sql`.

## Proximos passos / Manutencao

1. **Rotacao de chaves**: atualizar `src/lib/supabase.ts` e revisar documentacao.
2. **Buckets**: manter publico apenas enquanto nao houver autenticacao; considerar mover upload sensivel para backend protegido.
3. **Monitoramento**: consultar `story_view_stats` para dashboards; usar `AdminStoryAnalytics` como front-end.
4. **Backups**: habilitar backups automaticos do projeto Supabase (painel > Database > Backups).
