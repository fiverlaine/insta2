# ANÁLISE COMPLETA DO PROJETO - Instagram Clone (InstaElite)

> **Data da análise:** 06/02/2026  
> **Projeto:** insta-profissional-react v1.0.0  
> **Stack:** React 18 + TypeScript + Vite + Supabase  
> **Objetivo:** Clone funcional do Instagram para uso como funil de marketing/leads com tracking avançado

---

## ÍNDICE

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura de Arquivos](#3-estrutura-de-arquivos)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Configurações do Projeto](#5-configurações-do-projeto)
6. [Banco de Dados Supabase](#6-banco-de-dados-supabase)
7. [Serviços (Services)](#7-serviços-services)
8. [Páginas Públicas (Visitante)](#8-páginas-públicas-visitante)
9. [Painel Administrativo](#9-painel-administrativo)
10. [Componentes Reutilizáveis](#10-componentes-reutilizáveis)
11. [Hooks Customizados](#11-hooks-customizados)
12. [Utilitários (Utils)](#12-utilitários-utils)
13. [Mocks e Dados Estáticos](#13-mocks-e-dados-estáticos)
14. [Estilos e CSS](#14-estilos-e-css)
15. [Integrações Externas](#15-integrações-externas)
16. [Fluxo de Dados](#16-fluxo-de-dados)
17. [Segurança e Observações](#17-segurança-e-observações)
18. [Storage Buckets](#18-storage-buckets)
19. [Realtime (WebSocket)](#19-realtime-websocket)
20. [Mapa de Rotas](#20-mapa-de-rotas)

---

## 1. VISÃO GERAL DO PROJETO

O projeto é um **clone funcional do Instagram** desenvolvido em React/TypeScript, projetado para funcionar como um **funil de marketing e captura de leads**. O sistema simula um perfil completo do Instagram incluindo:

- **Perfil público** com avatar, bio, posts, stories
- **Sistema de chat/DM** entre visitante e administrador
- **Stories interativos** com links clicáveis e tracking de visualização
- **Tracking avançado** com fingerprinting, geolocalização e integração com Facebook Pixel
- **Painel administrativo completo** para gerenciar todo o conteúdo

### Propósito de Negócio

O projeto simula um perfil de Instagram para **atrair visitantes**, fazê-los interagir (seguir, curtir, ver stories, enviar mensagens) e **rastrear cada interação** para fins de marketing digital, especificamente para:

- Captura de leads via stories com links
- Rastreamento de conversões via Meta/Facebook Pixel
- Analytics detalhados de engajamento com stories
- Comunicação direta via chat

---

## 2. STACK TECNOLÓGICA

### Frontend

| Tecnologia           | Versão   | Uso                                |
| -------------------- | -------- | ---------------------------------- |
| React                | ^18.3.1  | Framework UI principal             |
| TypeScript           | ^5.5.4   | Tipagem estática                   |
| Vite                 | ^5.4.3   | Bundler e dev server               |
| React Router DOM     | ^6.26.0  | Roteamento SPA                     |
| TanStack React Query | ^5.83.0  | Gerenciamento de estado assíncrono |
| Lucide React         | ^0.427.0 | Biblioteca de ícones               |
| Recharts             | ^3.3.0   | Gráficos no painel admin           |

### Backend/Banco de Dados

| Tecnologia        | Uso                                                    |
| ----------------- | ------------------------------------------------------ |
| Supabase          | Backend-as-a-Service (PostgreSQL + Storage + Realtime) |
| PostgreSQL 17.6.1 | Banco de dados relacional                              |
| Supabase Realtime | WebSocket para chat e atualizações em tempo real       |
| Supabase Storage  | Armazenamento de mídias (imagens, vídeos)              |

### Tracking/Analytics

| Tecnologia     | Versão  | Uso                             |
| -------------- | ------- | ------------------------------- |
| FingerprintJS  | ^5.0.1  | Fingerprinting de navegador     |
| UA Parser JS   | ^2.0.6  | Parsing de User Agent           |
| Facebook Pixel | SDK web | Rastreamento de conversões Meta |

### Configuração

| Arquivo            | Função                                            |
| ------------------ | ------------------------------------------------- |
| `vite.config.ts`   | Build com base `/instagram/`, alias `@` → `./src` |
| `tsconfig.json`    | Target ES2020, strict mode, paths alias           |
| `eslint.config.js` | Configuração mínima, ignora dist e node_modules   |

---

## 3. ESTRUTURA DE ARQUIVOS

```
insta2-main/
├── index.html                    # Entry point HTML com Meta Pixel e fbp cookie
├── package.json                  # Dependências e scripts
├── vite.config.ts                # Configuração Vite (base: /instagram/)
├── tsconfig.json                 # Configuração TypeScript
├── tsconfig.node.json            # TS config para Vite
├── eslint.config.js              # Linter
├── .gitignore                    # Ignores
│
├── assets/images/                # Imagens estáticas (icons, splash)
├── constants/colors.ts           # Paleta de cores (não utilizado ativamente)
├── public/                       # Assets públicos (imagens, _redirects)
│
├── documentation/                # Documentação do projeto
│   ├── backend.md                # Docs do backend/Supabase
│   └── ANALISE_COMPLETA_PROJETO.md  # ← ESTE ARQUIVO
│
├── src/
│   ├── main.tsx                  # Entry point React (StrictMode + render)
│   ├── App.tsx                   # Roteamento principal + Facebook Pixel init
│   ├── App.module.css            # Estilos do container principal
│   ├── vite-env.d.ts             # Tipos para CSS Modules
│   │
│   ├── lib/
│   │   └── supabase.ts           # Cliente Supabase + interfaces de tipos
│   │
│   ├── services/                 # Camada de serviços (lógica de negócio)
│   │   ├── profileService.ts     # Perfil e posts (CRUD + cache estático)
│   │   ├── storyService.ts       # Stories (CRUD + cache localStorage)
│   │   ├── highlightService.ts   # Destaques/Highlights (CRUD + cache localStorage)
│   │   ├── chatService.ts        # Chat/DM (visitante e admin)
│   │   ├── commentService.ts     # Comentários (CRUD + hierarquia)
│   │   ├── followService.ts      # Sistema de follow
│   │   ├── likeService.ts        # Likes em posts e stories
│   │   ├── mediaService.ts       # Upload e processamento de mídia
│   │   ├── settingsService.ts    # Configurações (Facebook Pixel ID)
│   │   ├── fingerprintService.ts # Fingerprinting completo do visitante
│   │   ├── storyViewTrackingService.ts # Tracking detalhado de views
│   │   └── avatarService.ts      # Geração de avatares aleatórios
│   │
│   ├── pages/                    # Páginas/Telas
│   │   ├── ProfileScreen.tsx     # Tela principal do perfil (~400 linhas)
│   │   ├── PostScreen.tsx        # Visualização individual de post (~399 linhas)
│   │   ├── StoryScreen.tsx       # Visualização de stories (~956 linhas)
│   │   ├── ChatScreen.tsx        # Chat/DM do visitante (~439 linhas)
│   │   ├── CommentsScreen.tsx    # Tela de comentários (~265 linhas)
│   │   ├── NotFoundScreen.tsx    # Página 404 (~15 linhas)
│   │   ├── AdminLogin.tsx        # Login do admin (~150 linhas)
│   │   ├── AdminPanelNew.tsx     # Dashboard admin (~229 linhas)
│   │   ├── AdminChat.tsx         # Chat admin (~294 linhas)
│   │   ├── AdminStoryAnalytics.tsx # Analytics de stories (~242 linhas)
│   │   ├── StoriesManager.tsx    # CRUD de stories (~145 linhas)
│   │   ├── HighlightsManager.tsx # CRUD de destaques (~250 linhas)
│   │   ├── ProfileManager.tsx    # CRUD de perfil e posts (~277 linhas)
│   │   ├── CommentsManager.tsx   # CRUD de comentários (~791 linhas)
│   │   ├── SettingsManager.tsx   # Configurações do sistema (~125 linhas)
│   │   └── *.module.css          # Estilos CSS Modules de cada página
│   │   └── HighlightsManager.module.css # Estilos do gerenciador de destaques
│   │
│   ├── components/               # Componentes reutilizáveis
│   │   ├── AdminLayout.tsx       # Layout do painel admin (~156 linhas)
│   │   ├── AdminLayout.module.css
│   │   └── RequireAdminAuth.tsx  # Route guard de autenticação (~35 linhas)
│   │
│   ├── hooks/                    # Hooks customizados
│   │   ├── useFollow.ts          # Hook de follow/unfollow (~48 linhas)
│   │   ├── usePostLike.ts        # Hook de like em posts (~54 linhas)
│   │   └── useStoryLike.ts       # Hook de like em stories (~61 linhas)
│   │
│   ├── utils/                    # Utilitários
│   │   ├── adminAuth.ts          # Autenticação admin (hardcoded) (~38 linhas)
│   │   ├── cacheBuster.ts        # Gestão de cache (~145 linhas)
│   │   ├── dataNormalization.ts  # Normalização + SHA256 para Pixel (~217 linhas)
│   │   ├── facebookPixel.ts      # Integração Meta Pixel (~373 linhas)
│   │   └── visitor.ts            # ID único do visitante (~25 linhas)
│   │
│   ├── mocks/                    # Dados mock/fallback
│   │   ├── profile.ts            # Perfil e posts mock (~66 linhas)
│   │   ├── comments.ts           # Comentários mock (~207 linhas)
│   │   └── stories.ts            # Stories mock (~22 linhas)
│   │
│   └── styles/
│       └── index.css             # Estilos globais (~80 linhas)
│
├── supabase_migration_comments.sql          # Migração: tabela comments
├── supabase_migration_story_views.sql       # Migração: tabela story_views
├── supabase_migration_story_views_precision.sql # Migração: colunas extras story_views
└── SUPABASE_INSTAGRAM_DOCUMENTATION.md      # Documentação completa do Supabase
```

---

## 4. ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                    │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Visitante   │  │    Admin     │  │  Facebook Pixel  │   │
│  │   (Público)   │  │  (Protegido) │  │   (Tracking)     │   │
│  ├──────────────┤  ├──────────────┤  ├──────────────────┤   │
│  │ ProfileScreen │  │ AdminPanel   │  │ PageView         │   │
│  │ PostScreen    │  │ AdminChat    │  │ Lead (stories)   │   │
│  │ StoryScreen   │  │ StoriesMgr   │  │ Custom Events    │   │
│  │ ChatScreen    │  │ ProfileMgr   │  │ Advanced Match   │   │
│  │ CommentsScr   │  │ CommentsMgr  │  └──────────────────┘   │
│  └──────┬───────┘  │ Analytics    │                          │
│         │          │ Settings     │                          │
│         │          └──────┬───────┘                          │
│         │                 │                                   │
│  ┌──────┴─────────────────┴────────────────────────────┐     │
│  │              SERVICES LAYER                          │     │
│  │  profileService │ storyService │ highlightService   │     │
│  │  chatService    │ commentService │ followService     │     │
│  │  likeService    │ mediaService   │ settingsService   │     │
│  │  fingerprintService │ storyViewTrackingService       │     │
│  └─────────────────────┬───────────────────────────────┘     │
│                        │                                      │
│  ┌─────────────────────┴───────────────────────────────┐     │
│  │                   SUPABASE CLIENT                    │     │
│  │  Database │ Storage │ Realtime (WebSocket)           │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │    SUPABASE CLOUD   │
                    │  (sa-east-1)        │
                    ├─────────────────────┤
                    │  PostgreSQL 17.6    │
                    │  12 tabelas         │
                    │  2 views            │
                    │  4 buckets storage  │
                    │  Realtime channels  │
                    │  RLS policies       │
                    └─────────────────────┘
```

---

## 5. CONFIGURAÇÕES DO PROJETO

### `package.json`

- **Nome:** `insta-profissional-react`
- **Type:** `module` (ESModules)
- **Scripts:**
  - `dev` → `vite` (servidor de desenvolvimento)
  - `build` → `tsc && vite build` (compilação + build)
  - `preview` → `vite preview` (preview do build)

### `vite.config.ts`

- **Base path:** `/instagram/` (deploy em subdiretório)
- **Alias:** `@` mapeia para `./src`
- **Plugin:** `@vitejs/plugin-react`

### `tsconfig.json`

- **Target:** ES2020
- **Strict mode:** Habilitado
- **noUnusedLocals/Parameters:** Habilitado
- **Paths:** `@/*` → `./src/*`

### `index.html`

- **Idioma:** pt-BR
- **Favicon:** Favicon oficial do Instagram
- **Scripts inline:**
  1. **Criação do cookie `_fbp`** — Gera Facebook Browser Parameter se não existir
  2. **Facebook Pixel SDK** — Carrega `fbevents.js` (inicialização via App.tsx)
  3. **Compartilhamento de fbp com iframes** — Listener `postMessage` para enviar `_fbp` para iframes

---

## 6. BANCO DE DADOS SUPABASE

### Informações do Projeto

| Campo          | Valor                                      |
| -------------- | ------------------------------------------ |
| **ID**         | `izuspwvgvozwdjzbrpvt`                     |
| **Região**     | `sa-east-1` (São Paulo)                    |
| **PostgreSQL** | 17.6.1.037                                 |
| **Status**     | ACTIVE_HEALTHY                             |
| **URL**        | `https://izuspwvgvozwdjzbrpvt.supabase.co` |

### Extensões Habilitadas

- `plpgsql`, `uuid-ossp`, `pgcrypto`, `pg_stat_statements`, `supabase_vault`, `pg_graphql`

---

### 6.1 Tabela: `profile_settings`

**Propósito:** Armazena as configurações do perfil simulado do Instagram.

| Coluna            | Tipo        | Nullable | Default              | Descrição              |
| ----------------- | ----------- | -------- | -------------------- | ---------------------- |
| `id`              | UUID        | NO       | `uuid_generate_v4()` | PK                     |
| `username`        | TEXT        | NO       | —                    | Username do perfil (@) |
| `name`            | TEXT        | NO       | —                    | Nome de exibição       |
| `avatar_url`      | TEXT        | YES      | —                    | URL do avatar          |
| `bio`             | TEXT[]      | YES      | —                    | Array de linhas da bio |
| `link`            | TEXT        | YES      | —                    | Link na bio            |
| `followers_count` | INTEGER     | YES      | `0`                  | Contagem de seguidores |
| `following_count` | INTEGER     | YES      | `0`                  | Contagem de seguindo   |
| `posts_count`     | INTEGER     | YES      | `0`                  | Contagem de posts      |
| `is_active`       | BOOLEAN     | YES      | `true`               | Se o perfil está ativo |
| `created_at`      | TIMESTAMPTZ | YES      | `NOW()`              | Criação                |
| `updated_at`      | TIMESTAMPTZ | YES      | `NOW()`              | Última atualização     |

**RLS:** Habilitado — leitura e escrita pública.

---

### 6.2 Tabela: `posts`

**Propósito:** Posts do feed do perfil (suporta carrossel de múltiplas imagens).

| Coluna             | Tipo        | Nullable | Default              | Descrição                 |
| ------------------ | ----------- | -------- | -------------------- | ------------------------- |
| `id`               | UUID        | NO       | `uuid_generate_v4()` | PK                        |
| `profile_username` | TEXT        | NO       | —                    | FK para profile_settings  |
| `images`           | TEXT[]      | NO       | —                    | Array de URLs das imagens |
| `likes_count`      | INTEGER     | YES      | `0`                  | Contagem de curtidas      |
| `comments_count`   | INTEGER     | YES      | `0`                  | Contagem de comentários   |
| `caption`          | TEXT        | YES      | —                    | Legenda do post           |
| `post_date`        | TEXT        | YES      | —                    | Data de publicação        |
| `order_index`      | INTEGER     | YES      | `0`                  | Ordem de exibição         |
| `is_active`        | BOOLEAN     | YES      | `true`               | Se o post está ativo      |
| `created_at`       | TIMESTAMPTZ | YES      | `NOW()`              | Criação                   |
| `updated_at`       | TIMESTAMPTZ | YES      | `NOW()`              | Última atualização        |

**RLS:** Habilitado — leitura e escrita pública.

---

### 6.3 Tabela: `stories`

**Propósito:** Stories com suporte a imagem e vídeo, links configuráveis.

| Coluna             | Tipo             | Nullable | Default             | Descrição                              |
| ------------------ | ---------------- | -------- | ------------------- | -------------------------------------- |
| `id`               | UUID             | NO       | `gen_random_uuid()` | PK                                     |
| `profile_username` | TEXT             | NO       | —                   | FK para profile_settings               |
| `media_url`        | TEXT             | NO       | —                   | URL da mídia                           |
| `media_type`       | TEXT             | NO       | —                   | `'image'` ou `'video'`                 |
| `thumbnail`        | TEXT             | YES      | —                   | Thumbnail para vídeos                  |
| `duration`         | INTEGER          | YES      | `5000`              | Duração em ms                          |
| `order_index`      | INTEGER          | YES      | `0`                 | Ordem de exibição                      |
| `is_active`        | BOOLEAN          | YES      | `true`              | Se está ativo                          |
| `show_link`        | BOOLEAN          | YES      | `false`             | Se mostra link                         |
| `link_type`        | TEXT             | YES      | `'none'`            | `'visible'`, `'invisible'` ou `'none'` |
| `link_x`           | DOUBLE PRECISION | YES      | `50`                | Posição X do link (%)                  |
| `link_y`           | DOUBLE PRECISION | YES      | `50`                | Posição Y do link (%)                  |
| `link_url`         | TEXT             | YES      | —                   | URL específica do story                |
| `created_at`       | TIMESTAMPTZ      | YES      | `NOW()`             | Criação                                |
| `updated_at`       | TIMESTAMPTZ      | YES      | `NOW()`             | Última atualização                     |

**RLS:** Habilitado — leitura e escrita pública.

---

### 6.4 Tabela: `story_views`

**Propósito:** Tracking detalhado de visualizações de stories com fingerprinting completo.

| Coluna               | Tipo             | Nullable | Default             | Descrição                  |
| -------------------- | ---------------- | -------- | ------------------- | -------------------------- |
| `id`                 | UUID             | NO       | `gen_random_uuid()` | PK                         |
| `story_id`           | UUID             | NO       | —                   | FK → `stories(id)` CASCADE |
| `visitor_id`         | TEXT             | NO       | —                   | ID do visitante            |
| `session_id`         | UUID             | YES      | `gen_random_uuid()` | ID da sessão               |
| `session_count`      | INTEGER          | NO       | `1`                 | Número de sessões          |
| `watch_time_ms`      | INTEGER          | NO       | `0`                 | Tempo assistido (ms)       |
| `viewed_percentage`  | NUMERIC(5,2)     | NO       | `0`                 | % visualizada              |
| `completed`          | BOOLEAN          | NO       | `false`             | Se completou               |
| `exit_reason`        | TEXT             | YES      | —                   | Motivo da saída            |
| `playback_events`    | JSONB            | NO       | `'[]'`              | Eventos de playback        |
| `first_viewed_at`    | TIMESTAMPTZ      | YES      | `NOW()`             | Primeira visualização      |
| `last_viewed_at`     | TIMESTAMPTZ      | YES      | `NOW()`             | Última visualização        |
| `ip_address`         | TEXT             | YES      | —                   | IP do visitante            |
| `country`            | TEXT             | YES      | —                   | País                       |
| `city`               | TEXT             | YES      | —                   | Cidade                     |
| `region`             | TEXT             | YES      | —                   | Região/Estado              |
| `latitude`           | DOUBLE PRECISION | YES      | —                   | Latitude                   |
| `longitude`          | DOUBLE PRECISION | YES      | —                   | Longitude                  |
| `isp`                | TEXT             | YES      | —                   | Provedor de internet       |
| `device_type`        | TEXT             | YES      | —                   | Tipo de dispositivo        |
| `device_model`       | TEXT             | YES      | —                   | Modelo do dispositivo      |
| `device_vendor`      | TEXT             | YES      | —                   | Fabricante                 |
| `browser`            | TEXT             | YES      | —                   | Navegador                  |
| `browser_version`    | TEXT             | YES      | —                   | Versão do navegador        |
| `os`                 | TEXT             | YES      | —                   | Sistema operacional        |
| `os_version`         | TEXT             | YES      | —                   | Versão do SO               |
| `user_agent`         | TEXT             | YES      | —                   | User Agent completo        |
| `fingerprint`        | TEXT             | NO       | —                   | Fingerprint combinado      |
| `canvas_fingerprint` | TEXT             | YES      | —                   | Canvas fingerprint         |
| `webgl_fingerprint`  | TEXT             | YES      | —                   | WebGL fingerprint          |
| `audio_fingerprint`  | TEXT             | YES      | —                   | Audio fingerprint          |
| `fonts_fingerprint`  | TEXT             | YES      | —                   | Fonts fingerprint          |
| `screen_resolution`  | TEXT             | YES      | —                   | Resolução da tela          |
| `screen_color_depth` | INTEGER          | YES      | —                   | Profundidade de cor        |
| `pixel_ratio`        | DOUBLE PRECISION | YES      | —                   | Pixel ratio                |
| `timezone`           | TEXT             | YES      | —                   | Fuso horário               |
| `language`           | TEXT             | YES      | —                   | Idioma principal           |
| `languages`          | TEXT[]           | YES      | —                   | Lista de idiomas           |
| `viewed_at`          | TIMESTAMPTZ      | NO       | `NOW()`             | Timestamp da view          |
| `created_at`         | TIMESTAMPTZ      | NO       | `NOW()`             | Criação                    |
| `updated_at`         | TIMESTAMPTZ      | NO       | `NOW()`             | Atualização                |

**Constraint UNIQUE:** `(story_id, fingerprint)` — Um registro por visitante por story.
**Índices:** `story_id`, `visitor_id`, `ip_address`, `viewed_at DESC`, `session_id`, `last_viewed_at DESC`
**RLS:** SELECT, INSERT, UPDATE e DELETE públicos.

---

### 6.5 Tabela: `profile_follows`

**Propósito:** Registra se um visitante seguiu o perfil.

| Coluna             | Tipo        | Nullable | Default              | Descrição          |
| ------------------ | ----------- | -------- | -------------------- | ------------------ |
| `id`               | UUID        | NO       | `uuid_generate_v4()` | PK                 |
| `visitor_id`       | TEXT        | NO       | —                    | ID do visitante    |
| `profile_username` | TEXT        | NO       | —                    | Username do perfil |
| `is_following`     | BOOLEAN     | YES      | `true`               | Se está seguindo   |
| `followed_at`      | TIMESTAMPTZ | YES      | `NOW()`              | Data do follow     |
| `updated_at`       | TIMESTAMPTZ | YES      | `NOW()`              | Atualização        |

**RLS:** Habilitado — leitura e escrita pública.

---

### 6.6 Tabela: `post_likes`

**Propósito:** Registra likes de visitantes em posts.

| Coluna       | Tipo        | Nullable | Default              | Descrição       |
| ------------ | ----------- | -------- | -------------------- | --------------- |
| `id`         | UUID        | NO       | `uuid_generate_v4()` | PK              |
| `visitor_id` | TEXT        | NO       | —                    | ID do visitante |
| `post_id`    | TEXT        | NO       | —                    | ID do post      |
| `is_liked`   | BOOLEAN     | YES      | `true`               | Se está curtido |
| `liked_at`   | TIMESTAMPTZ | YES      | `NOW()`              | Data do like    |
| `updated_at` | TIMESTAMPTZ | YES      | `NOW()`              | Atualização     |

**RLS:** Habilitado — leitura e escrita pública.

---

### 6.7 Tabela: `story_likes`

**Propósito:** Registra likes de visitantes em stories.

| Coluna       | Tipo        | Nullable | Default              | Descrição       |
| ------------ | ----------- | -------- | -------------------- | --------------- |
| `id`         | UUID        | NO       | `uuid_generate_v4()` | PK              |
| `visitor_id` | TEXT        | NO       | —                    | ID do visitante |
| `story_id`   | TEXT        | NO       | —                    | ID do story     |
| `is_liked`   | BOOLEAN     | YES      | `true`               | Se está curtido |
| `liked_at`   | TIMESTAMPTZ | YES      | `NOW()`              | Data do like    |
| `updated_at` | TIMESTAMPTZ | YES      | `NOW()`              | Atualização     |

**RLS:** Habilitado — leitura e escrita pública.

---

### 6.8 Tabela: `conversations`

**Propósito:** Conversas do chat entre visitantes e admin.

| Coluna            | Tipo        | Nullable | Default              | Descrição           |
| ----------------- | ----------- | -------- | -------------------- | ------------------- |
| `id`              | UUID        | NO       | `uuid_generate_v4()` | PK                  |
| `visitor_id`      | TEXT        | NO       | —                    | ID do visitante     |
| `visitor_name`    | TEXT        | YES      | `'Visitante'`        | Nome exibido        |
| `last_message_at` | TIMESTAMPTZ | YES      | `NOW()`              | Última mensagem     |
| `unread_count`    | INTEGER     | YES      | `0`                  | Mensagens não lidas |
| `created_at`      | TIMESTAMPTZ | YES      | `NOW()`              | Criação             |
| `updated_at`      | TIMESTAMPTZ | YES      | `NOW()`              | Atualização         |

**Realtime:** Habilitado com `REPLICA IDENTITY FULL`.
**RLS:** Habilitado — leitura e escrita pública.

---

### 6.9 Tabela: `messages`

**Propósito:** Mensagens individuais dentro de conversas.

| Coluna                        | Tipo        | Nullable | Default              | Descrição                                     |
| ----------------------------- | ----------- | -------- | -------------------- | --------------------------------------------- |
| `id`                          | UUID        | NO       | `uuid_generate_v4()` | PK                                            |
| `conversation_id`             | UUID        | NO       | —                    | FK → `conversations(id)`                      |
| `content`                     | TEXT        | YES      | —                    | Texto da mensagem                             |
| `is_from_admin`               | BOOLEAN     | YES      | `false`              | Se foi enviada pelo admin                     |
| `read`                        | BOOLEAN     | YES      | `false`              | Se foi lida                                   |
| `media_url`                   | TEXT        | YES      | —                    | URL da mídia anexada                          |
| `media_type`                  | TEXT        | YES      | —                    | `'image'`, `'video'`, `'audio'`, `'document'` |
| `media_thumbnail`             | TEXT        | YES      | —                    | Thumbnail da mídia                            |
| `media_duration`              | INTEGER     | YES      | —                    | Duração da mídia (seg)                        |
| `replied_to_story_media_url`  | TEXT        | YES      | —                    | URL da mídia do story respondido              |
| `replied_to_story_media_type` | TEXT        | YES      | —                    | Tipo da mídia do story                        |
| `replied_to_story_id`         | TEXT        | YES      | —                    | ID do story respondido                        |
| `replied_to_story_thumbnail`  | TEXT        | YES      | —                    | Thumbnail do story                            |
| `created_at`                  | TIMESTAMPTZ | YES      | `NOW()`              | Criação                                       |
| `updated_at`                  | TIMESTAMPTZ | YES      | `NOW()`              | Atualização                                   |

**Realtime:** Habilitado com `REPLICA IDENTITY FULL`.
**RLS:** Habilitado — leitura e escrita pública.

---

### 6.10 Tabela: `comments`

**Propósito:** Comentários em posts com suporte a respostas aninhadas (hierarquia).

| Coluna              | Tipo        | Nullable | Default              | Descrição                              |
| ------------------- | ----------- | -------- | -------------------- | -------------------------------------- |
| `id`                | UUID        | NO       | `uuid_generate_v4()` | PK                                     |
| `post_id`           | TEXT        | NO       | —                    | ID do post                             |
| `parent_comment_id` | UUID        | YES      | —                    | FK → `comments(id)` CASCADE (resposta) |
| `username`          | TEXT        | NO       | —                    | Username do comentarista               |
| `avatar_url`        | TEXT        | YES      | —                    | Avatar do comentarista                 |
| `is_verified`       | BOOLEAN     | YES      | `false`              | Badge de verificado                    |
| `text`              | TEXT        | NO       | —                    | Texto do comentário                    |
| `image_url`         | TEXT        | YES      | —                    | Imagem no comentário                   |
| `likes_count`       | INTEGER     | YES      | `0`                  | Curtidas no comentário                 |
| `time_ago`          | TEXT        | NO       | —                    | Tempo relativo ("2h", "1d")            |
| `created_at`        | TIMESTAMPTZ | YES      | `NOW()`              | Criação                                |
| `updated_at`        | TIMESTAMPTZ | YES      | `NOW()`              | Atualização                            |

**Índices:** `post_id`, `parent_comment_id`, `created_at DESC`
**RLS:** Leitura pública; escrita apenas para `authenticated`.

---

### 6.11 Tabela: `highlights`

**Propósito:** Define os grupos de destaques (highlights) que aparecem no perfil.

| Coluna             | Tipo        | Nullable | Default             | Descrição                         |
| ------------------ | ----------- | -------- | ------------------- | --------------------------------- |
| `id`               | UUID        | NO       | `gen_random_uuid()` | PK                                |
| `profile_username` | TEXT        | NO       | —                   | FK → `profile_settings(username)` |
| `name`             | TEXT        | NO       | —                   | Nome do destaque                  |
| `cover_media_url`  | TEXT        | YES      | —                   | URL da imagem de capa             |
| `order_index`      | INTEGER     | YES      | `0`                 | Ordem de exibição                 |
| `is_active`        | BOOLEAN     | YES      | `true`              | Se está visível                   |
| `created_at`       | TIMESTAMPTZ | YES      | `NOW()`             | Criação                           |
| `updated_at`       | TIMESTAMPTZ | YES      | `NOW()`             | Atualização                       |

**RLS:** Leitura e escrita pública.

---

### 6.12 Tabela: `highlight_stories`

**Propósito:** Relaciona stories específicos a um destaque (Relationship N:N).

| Coluna         | Tipo        | Nullable | Default             | Descrição                |
| -------------- | ----------- | -------- | ------------------- | ------------------------ |
| `id`           | UUID        | NO       | `gen_random_uuid()` | PK                       |
| `highlight_id` | UUID        | NO       | —                   | FK → `highlights(id)`    |
| `story_id`     | UUID        | NO       | —                   | FK → `stories(id)`       |
| `order_index`  | INTEGER     | YES      | `0`                 | Ordem dentro do destaque |
| `created_at`   | TIMESTAMPTZ | YES      | `NOW()`             | Criação                  |

**RLS:** Leitura e escrita pública.

---

### 6.13 Tabela: `settings`

**Propósito:** Configurações gerais do sistema (key-value).

| Coluna        | Tipo        | Descrição                                       |
| ------------- | ----------- | ----------------------------------------------- |
| `key`         | TEXT        | Chave da configuração (ex: `facebook_pixel_id`) |
| `value`       | TEXT        | Valor da configuração                           |
| `description` | TEXT        | Descrição opcional                              |
| `updated_at`  | TIMESTAMPTZ | Última atualização                              |

---

### 6.12 View: `comments_stats`

**Propósito:** Estatísticas agregadas de comentários por post.

| Coluna            | Tipo        | Descrição                      |
| ----------------- | ----------- | ------------------------------ |
| `post_id`         | TEXT        | ID do post                     |
| `comments_count`  | BIGINT      | Comentários principais         |
| `replies_count`   | BIGINT      | Respostas                      |
| `total_count`     | BIGINT      | Total (principais + respostas) |
| `total_likes`     | BIGINT      | Soma de likes                  |
| `last_comment_at` | TIMESTAMPTZ | Último comentário              |

---

### 6.13 View: `story_view_stats`

**Propósito:** Estatísticas agregadas de visualizações por story.

| Coluna                       | Tipo        | Descrição                      |
| ---------------------------- | ----------- | ------------------------------ |
| `story_id`                   | UUID        | ID do story                    |
| `unique_views`               | BIGINT      | Views únicas (por fingerprint) |
| `total_views`                | BIGINT      | Total de sessões               |
| `unique_ips`                 | BIGINT      | IPs únicos                     |
| `unique_visitors`            | BIGINT      | Visitor IDs únicos             |
| `countries_count`            | BIGINT      | Países diferentes              |
| `cities_count`               | BIGINT      | Cidades diferentes             |
| `device_types_count`         | BIGINT      | Tipos de dispositivo           |
| `last_viewed_at`             | TIMESTAMPTZ | Última visualização            |
| `first_viewed_at`            | TIMESTAMPTZ | Primeira visualização          |
| `views_last_24h`             | BIGINT      | Views nas últimas 24h          |
| `completed_views`            | BIGINT      | Views completadas              |
| `completion_rate_percentage` | NUMERIC     | Taxa de conclusão (%)          |
| `avg_watch_time_ms`          | NUMERIC     | Tempo médio assistido          |
| `avg_viewed_percentage`      | NUMERIC     | % média visualizada            |
| `total_watch_time_ms`        | NUMERIC     | Tempo total assistido          |

---

### 6.14 Functions e Triggers

| Function                           | Trigger         | Tabela        | Descrição                                   |
| ---------------------------------- | --------------- | ------------- | ------------------------------------------- |
| `set_updated_at()`                 | `BEFORE UPDATE` | Várias        | Atualiza `updated_at` automaticamente       |
| `update_conversation_on_message()` | `AFTER INSERT`  | `messages`    | Atualiza `last_message_at` e `unread_count` |
| `update_story_views_updated_at()`  | `BEFORE UPDATE` | `story_views` | Atualiza `updated_at` em story_views        |
| `update_comments_updated_at()`     | `BEFORE UPDATE` | `comments`    | Atualiza `updated_at` em comments           |

---

## 7. SERVIÇOS (SERVICES)

### 7.1 `profileService.ts` (~795 linhas)

**Responsabilidade:** CRUD completo de perfil e posts com sistema de cache em 3 camadas.

**Estratégia de Cache (ordem de prioridade):**

1. **Arquivo estático JSON** no Supabase Storage (mais rápido)
2. **localStorage** com TTL de 5 minutos
3. **Query no Supabase** (banco de dados)

**Métodos principais:**

- `getProfile()` — Busca perfil ativo (estático → cache → banco)
- `updateProfile()` — Atualiza perfil + regenera arquivos estáticos
- `uploadAvatar()` — Upload de avatar para Storage
- `getPosts()` / `getAllPosts()` — Busca posts
- `createPost()` / `updatePost()` / `deletePost()` — CRUD de posts
- `togglePostActive()` — Ativa/desativa post
- `reorderPosts()` — Reordena posts
- `uploadPostImage()` — Upload de imagem de post
- `generateStaticFiles()` — Gera JSONs estáticos no Storage

**Arquivos estáticos gerados:**

- `static-profile-data.json` → Dados do perfil
- `static-posts-data.json` → Dados dos posts

---

### 7.2 `storyService.ts` (~462 linhas)

**Responsabilidade:** CRUD de stories com cache localStorage.

**Métodos principais:**

- `uploadStoryMedia()` — Upload para bucket `stories-media`
- `createStory()` — Criar story com auto-incremento de order_index
- `getActiveStories()` — Listar ativos (cache 5min → banco)
- `getAllStories()` — Listar todos (admin)
- `deleteStory()` / `toggleStoryActive()` — Gerenciamento
- `toggleStoryLink()` / `updateStoryLinkConfig()` — Configurar links
- `reorderStories()` — Reordenar
- `updateStoryThumbnail()` — Atualizar thumbnail de vídeo
- `getVideoDuration()` — Detectar duração de vídeo

---

### 7.3 `highlightService.ts` (~420 linhas)

**Responsabilidade:** CRUD de destaques e associação com stories.

**Métodos principais:**

- `getAllHighlights()` — Lista todos os destaques de um perfil (admin)
- `getActiveHighlights()` — Lista apenas ativos com stories inclusos (visitante)
- `createHighlight()` — Cria destaque + associa stories iniciais
- `updateHighlight()` — Atualiza nome/capa
- `updateHighlightStories()` — Atualiza lista de stories vinculados
- `deleteHighlight()` — Remove destaque (cascade remove associações)
- `toggleHighlightActive()` — Ativa/desativa visualização
- `uploadHighlightCover()` — Upload de capa para storage
- `clearCache()` — Limpa cache local

---

### 7.4 `chatService.ts` (~290 linhas)

**Responsabilidade:** Sistema de chat com mensagens em tempo real.

**Classes:**

- **`ChatService`** (visitante):
  - `getOrCreateConversation()` — Cria ou recupera conversa
  - `sendMessage()` — Envia mensagem com suporte a mídia e resposta a story
  - `getMessages()` — Busca mensagens
  - `subscribeToMessages()` — Realtime via WebSocket
  - `markAsRead()` — Marca como lidas

- **`AdminChatService`** (admin):
  - `getAllConversations()` — Lista todas as conversas
  - `sendAdminMessage()` — Envia como admin
  - `subscribeToConversations()` — Realtime de conversas

---

### 7.4 `commentService.ts` (~229 linhas)

**Responsabilidade:** CRUD de comentários com hierarquia (replies).

**Métodos:**

- `getCommentsByPost()` — Busca e organiza comentários em árvore
- `createComment()` — Cria comentário (root ou reply)
- `updateComment()` — Atualiza comentário
- `deleteComment()` — Deleta (cascade para replies)
- `countComments()` — Conta via view `comments_stats`
- `getAllCommentsStats()` — Stats de todos os posts
- `subscribeToComments()` — Realtime

---

### 7.5 `followService.ts` (~172 linhas)

**Responsabilidade:** Sistema de follow/unfollow com cache.

**Métodos:**

- `getCachedFollowState()` — Estado do cache (síncrono)
- `isFollowing()` — Verifica no banco
- `toggleFollow()` — Alterna estado (cria ou atualiza registro)
- `subscribeToFollow()` — Realtime

---

### 7.6 `likeService.ts` (~371 linhas)

**Responsabilidade:** Likes em posts e stories com cache.

**Métodos para Posts:**

- `getCachedPostLikeState()` / `isPostLiked()` — Estado do like
- `togglePostLike()` — Alternar like
- `subscribeToPostLike()` — Realtime

**Métodos para Stories:**

- `getCachedStoryLikeState()` / `isStoryLiked()` — Estado do like
- `toggleStoryLike()` — Alternar like
- `subscribeToStoryLike()` — Realtime

---

### 7.7 `mediaService.ts` (~277 linhas)

**Responsabilidade:** Upload e processamento de mídias.

**Métodos:**

- `uploadFile()` — Upload para bucket `chat-media`
- `getMediaType()` — Detecta tipo (imagem/vídeo/áudio/documento)
- `isValidFileType()` — Valida tipos permitidos
- `formatFileSize()` — Formata tamanho em KB/MB
- `createVideoThumbnail()` — Gera thumbnail de vídeo (via canvas)
- `createVideoThumbnailFromUrl()` — Thumbnail de URL de vídeo
- `getMediaDuration()` — Duração de áudio/vídeo
- `formatDuration()` — Formata em MM:SS
- `compressImage()` — Comprime imagem (max 1920px largura)

---

### 7.8 `settingsService.ts` (~56 linhas)

**Responsabilidade:** CRUD da tabela `settings` (key-value).

**Métodos:**

- `getSetting(key)` — Busca valor
- `updateSetting(key, value)` — Atualiza valor
- `getFacebookPixelId()` — Atalho para pixel ID
- `setFacebookPixelId()` — Atalho para definir pixel

---

### 7.9 `fingerprintService.ts` (~513 linhas)

**Responsabilidade:** Fingerprinting completo do visitante.

**Dados coletados:**

- **FingerprintJS** → Visitor ID único
- **Geolocalização** → IP, país, cidade, região, lat/long, ISP (3 APIs de fallback: ipapi.co → ip-api.com → ipinfo.io)
- **Dispositivo** → Tipo, modelo, fabricante (via UA Parser)
- **Canvas Fingerprint** → Hash do rendering de canvas
- **WebGL Fingerprint** → GPU vendor + renderer
- **Audio Fingerprint** → Hash do audio context
- **Fonts Fingerprint** → Fontes instaladas detectadas
- **Screen** → Resolução, color depth, pixel ratio
- **Language** → Idioma, lista de idiomas, timezone

**Cache de geolocalização:** 1 hora

---

### 7.10 `storyViewTrackingService.ts` (~597 linhas)

**Responsabilidade:** Tracking detalhado de visualizações de stories.

**Conceito de sessão:**

1. `beginViewSession()` — Inicia sessão (gera fingerprint, verifica existente)
2. `commitViewSession()` — Finaliza com métricas (INSERT ou UPDATE)

**Métricas rastreadas:**

- Tempo assistido (ms)
- Porcentagem visualizada (0-100%)
- Se completou o story
- Motivo da saída (`auto_advance`, `manual_next`, `close_button`, `link_click`, `chat_reply`, etc.)
- Eventos de playback (`enter`, `play`, `pause`, `resume`, `mute_toggle`, `progress`, `complete`, `exit`, `reply`, `link`)

**Critérios mínimos para contar view:**

- Imagem: ≥1200ms OU ≥20%
- Vídeo: ≥1800ms OU ≥20%

**Consultas de analytics:**

- `getStoryStats()` — Stats agregadas (via view)
- `getStoryViews()` — Lista de visualizações
- `getViewsByCountry()` / `getViewsByDevice()` / `getViewsByCity()` — Agrupamentos
- `getAllStoriesStats()` — Stats de todos os stories

---

### 7.11 `avatarService.ts` (~49 linhas)

**Responsabilidade:** Geração de avatares aleatórios via Random User API.

**Métodos:**

- `getRandomAvatar()` — Avatar aleatório
- `getAvatarByName(name)` — Avatar determinístico baseado no nome (hash)
- `getMultipleAvatars(count)` — Múltiplos avatares

---

## 8. PÁGINAS PÚBLICAS (VISITANTE)

### 8.1 `ProfileScreen.tsx` (~400 linhas)

**Rota:** `/`

**Funcionalidades:**

- Header com username
- Avatar com gradiente (clicável → abre stories)
- Nome e estatísticas (posts, seguidores, seguindo)
- Bio multi-linha com link
- Botões: Seguir, Mensagem, Ícone
- Grid de posts (3 colunas) com indicador de carrossel
- Tabs: Grid, Reels, Tagged (apenas Grid funcional)
- Skeleton loading
- Normalização de URLs (Supabase Storage + caminhos locais)
- Cache síncrono para carregamento instantâneo

---

### 8.2 `PostScreen.tsx` (~399 linhas)

**Rota:** `/post/:postId`

**Funcionalidades:**

- Carrossel de imagens com scroll snap horizontal
- Indicadores de progresso (dots + contador x/n)
- Like com duplo-tap e animação de coração
- Botões: Like, Comentar, Compartilhar, Salvar
- Exibição de likes count e caption
- Navegação para comentários
- Contagem de comentários do Supabase
- Compartilhamento nativo (`navigator.share`) ou cópia de link

---

### 8.3 `StoryScreen.tsx` (~956 linhas) ⭐ MAIS COMPLEXA

**Rota:** `/story`

**Funcionalidades:**

- Barra de progresso animada por story
- Navegação toque esquerda/direita + avanço automático
- Suporte a vídeo e imagem
- Pause ao segurar (toque no centro)
- Prefetch da próxima imagem
- **Links clicáveis:**
  - `visible` → Botão visível posicionável (x/y %)
  - `invisible` → Área transparente clicável posicionável
- Iframe modal para links
- **IframeWithFbp** → Injeta cookie `_fbp` na URL do iframe
- Resposta ao story via chat (com referência ao story)
- Geração automática de thumbnails para vídeos
- Like em stories
- Botão de seguir
- **Tracking completo:**
  - Sessão de visualização com fingerprint
  - Tempo assistido, % visualizada, conclusão
  - Eventos de playback detalhados
  - Motivo de saída
- **Facebook Pixel:** `trackLeadFromStory` ao clicar em link
- Swipe-down para fechar com animação
- Gestão de visibilidade da aba (pause quando oculta)

---

### 8.4 `ChatScreen.tsx` (~439 linhas)

**Rota:** `/chat`

**Funcionalidades:**

- Cabeçalho com info do perfil
- Introdução (avatar, nome, seguidores)
- Lista de mensagens com scroll automático
- Envio de texto
- Upload e envio de mídia (imagem, vídeo, áudio)
- Compressão de imagens
- Thumbnails de vídeo
- Resposta a story (com preview clicável)
- Modal de imagem em tela cheia
- Realtime (novas mensagens via WebSocket)
- Marcação como lido

---

### 8.5 `CommentsScreen.tsx` (~265 linhas)

**Rota:** `/post/:postId/comments`

**Funcionalidades:**

- Lista de comentários organizados hierarquicamente
- Respostas aninhadas (expandir/ocultar)
- Like em comentários (local)
- Badge de verificação
- Destaque de hashtags e menções
- Avatares aleatórios via AvatarService

---

### 8.6 `NotFoundScreen.tsx` (~15 linhas)

**Rota:** `*` (qualquer rota não encontrada)

**Funcionalidades:**

- Mensagem "Página não encontrada"
- Link para voltar ao perfil

---

## 9. PAINEL ADMINISTRATIVO

### Acesso

- **URL base:** `/admin987654321`
- **Login:** `/admin987654321/login`
- **Credenciais:** `admin@gmail.com` / `Matematica123*` (hardcoded)
- **Proteção:** Componente `RequireAdminAuth` em todas as rotas admin
- **Token:** Salvo em `localStorage` como `admin_token`

---

### 9.1 `AdminLogin.tsx` (~150 linhas)

**Rota:** `/admin987654321/login`

- Formulário com email e senha
- Toggle de visibilidade da senha
- Redirect automático se já autenticado
- Suporte a redirect path (volta para página tentada)

---

### 9.2 `AdminPanelNew.tsx` — Dashboard (~229 linhas)

**Rota:** `/admin987654321`

- **KPI Cards:** Visitantes Únicos, Novos Leads, Seguidores, Cliques
- **Bento Grid:**
  - Tráfego em Tempo Real
  - Inventário de Mídia (posts/stories)
  - Card Premium Upgrade
- Auto-refresh a cada 30 segundos

---

### 9.3 `AdminChat.tsx` (~294 linhas)

**Rota:** `/admin987654321/chat`

- Sidebar com lista de conversas (badge não lidas)
- Chat em tempo real
- Envio de texto e mídia (imagem com compressão, vídeo com thumbnail)
- Realtime via Supabase Channels
- Modal de visualização de imagem

---

### 9.4 `StoriesManager.tsx` (~145 linhas)

**Rota:** `/admin987654321/stories`

- Upload de novos stories (imagem/vídeo)
- Grid com preview de mídia
- Toggle ativo/inativo
- Exclusão com confirmação
- Gráficos de retenção e cliques
- Listagem detalhada de visualizações por IP/Localização

### 9.5 `HighlightsManager.tsx` (~250 linhas)

**Funcionalidade:** Gestão de destaques estilo Instagram.

- Criação de novos grupos de destaques
- Seleção visual de stories existentes para compor o destaque
- Ordenação manual de stories dentro do destaque
- Upload de capas personalizadas ou uso de thumbnails automáticas
- Toggle de visibilidade no perfil público

### 9.6 `ProfileManager.tsx` (~277 linhas)

**Rota:** `/admin987654321/profile`

- **Aba Perfil:** Username, nome, avatar (upload), bio (multi-linha), link, seguidores/seguindo
- **Aba Posts:** Grid de posts, criar/editar/deletar post, múltiplas imagens, legenda, data, likes

---

### 9.6 `CommentsManager.tsx` (~791 linhas)

**Rota:** `/admin987654321/comments`

- Seletor de post (dropdown com preview)
- CRUD de comentários e respostas aninhadas
- Formulário: username, avatar (URL/upload/aleatório), verificado, texto, likes, tempo
- Upload de avatar para Storage
- Botão "Copiar Código" (exportar JSON)

---

### 9.7 `AdminStoryAnalytics.tsx` (~242 linhas)

**Rota:** `/admin987654321/analytics`

- Seletor de story (rail horizontal)
- Stat cards: Views, Leads, Retenção, Taxa de Conclusão
- Gráfico de barras por país (Recharts)
- Gráfico de pizza por dispositivo (Recharts)
- Lista de views recentes com detalhes expandíveis

---

### 9.8 `SettingsManager.tsx` (~125 linhas)

**Rota:** `/admin987654321/settings`

- Configuração do Facebook Pixel ID
- Feedback de sucesso/erro

---

## 10. COMPONENTES REUTILIZÁVEIS

### 10.1 `AdminLayout.tsx` (~156 linhas)

**Usado por:** Todas as páginas admin

- Sidebar com branding "InstaElite"
- Menu de navegação agrupado:
  - **Principal:** Dashboard, Mensagens (badge), Stories
  - **Conteúdo:** Perfil, Interações (Comments)
  - **Engajamento:** Relatórios (Analytics)
  - **Sistema:** Configurações
- Top bar com busca, notificações (badge), info do admin
- Área de conteúdo renderiza `children`

---

### 10.2 `RequireAdminAuth.tsx` (~35 linhas)

**Usado por:** Wrapping de todas as rotas admin em `App.tsx`

- Verifica `isAdminAuthenticated()` via localStorage
- Se não autenticado → redirect para login (preserva rota de origem)
- Se autenticado → renderiza children
- Estado de loading enquanto verifica

---

## 11. HOOKS CUSTOMIZADOS

### 11.1 `useFollow.ts` (~48 linhas)

- Carrega estado do cache (síncrono instantâneo)
- Verifica no banco (assíncrono)
- Subscribe realtime para mudanças
- Retorna: `{ isFollowing, loading, toggleFollow }`

### 11.2 `usePostLike.ts` (~54 linhas)

- Carrega estado do cache (síncrono)
- Verifica no banco (assíncrono)
- Subscribe realtime
- Calcula `likesCount = baseLikes + (isLiked ? 1 : 0)`
- Retorna: `{ isLiked, likesCount, loading, toggleLike }`

### 11.3 `useStoryLike.ts` (~61 linhas)

- Validação de storyId (proteção contra vazio)
- Carrega cache → verifica banco → subscribe realtime
- Retorna: `{ isLiked, loading, toggleLike }`

**Padrão comum dos hooks:** Cache síncrono → Verificação assíncrona → Realtime subscription → Cleanup no unmount

---

## 12. UTILITÁRIOS (UTILS)

### 12.1 `adminAuth.ts` (~38 linhas)

- `isAdminAuthenticated()` — Verifica token no localStorage
- `authenticateAdmin(email, password)` — Valida credenciais hardcoded
- `logoutAdmin()` — Remove token
- `getAdminEmail()` — Retorna email fixo
- **Credenciais fixas:** `admin@gmail.com` / `Matematica123*`

### 12.2 `cacheBuster.ts` (~145 linhas)

- `clearAllCache()` — Limpa localStorage, sessionStorage, Service Workers, Cache API
- `addCacheBuster(url)` — Adiciona `_t=timestamp` na URL
- `forceHardReload()` — Reload completo da página
- `clearSupabaseImageCache()` — Limpa caches específicos de perfil/posts
- `preloadImage(url)` / `preloadImages(urls)` — Pré-carregamento
- `isImageAccessible(url)` — Verifica acessibilidade (HEAD request)
- `diagnoseImageLoading(urls)` — Diagnóstico completo

### 12.3 `dataNormalization.ts` (~217 linhas)

- Normalização de dados pessoais para Meta Pixel Advanced Matching:
  - `normalizeEmail`, `normalizePhone`, `normalizeName`, `normalizeZip`, `normalizeCity`, `normalizeState`, `normalizeCountry`
- Hash SHA256 via Web Crypto API:
  - `hashSHA256`, `hashEmail`, `hashPhone`, `hashName`, etc.

### 12.4 `facebookPixel.ts` (~373 linhas)

- `isPixelLoaded()` — Verifica se `window.fbq` existe
- `getFbpCookie()` / `getFbcCookie()` — Lê cookies do Facebook
- `trackEvent(eventName, params)` — Rastreia evento padrão com:
  - Advanced Matching (fingerprint, geolocalização)
  - Custom Parameters (IP, user agent, fbp, fbc)
  - Timeout de 2 segundos com fallback
- `trackCustomEvent(eventName, params)` — Evento customizado
- `trackLeadFromStory(storyIndex, linkUrl)` — Evento "Lead" de story

### 12.5 `visitor.ts` (~25 linhas)

- `getVisitorId()` — Gera/recupera ID único `visitor_{timestamp}_{random}` via localStorage
- `clearVisitorId()` — Limpa ID (para testes)

---

## 13. MOCKS E DADOS ESTÁTICOS

### 13.1 `mocks/profile.ts` (~66 linhas)

- Perfil mock: "Pedro Monteiro" (@pedroomonteeiroo\_\_)
- 234K followers, 387 following
- Bio motivacional
- 3 posts com imagens locais

### 13.2 `mocks/comments.ts` (~207 linhas)

- Comentários mock para 3 posts
- Hierarquia com replies aninhados
- `getCommentsForPost(postId)` — Busca do localStorage → dados fake
- `countTotalComments(postId)` — Conta total incluindo replies

### 13.3 `mocks/stories.ts` (~22 linhas)

- 2 stories mock de tipo imagem
- Duração de 5000ms cada

---

## 14. ESTILOS E CSS

### Estratégia

- **CSS Modules** (`.module.css`) para cada página/componente
- **CSS global** (`styles/index.css`) para reset e layout base

### Layout Base (`index.css`)

- **Reset global:** margin/padding 0, box-sizing border-box
- **Fundo:** `#1a1a1a` (cinza escuro, estilo Instagram dark mode)
- **Texto:** Branco, font-family sistema (Apple, Segoe UI, Roboto...)
- **Desktop (≥768px):** Conteúdo limitado a `480px` (simula celular) em fundo `#000` com sombra
- **Mobile (<768px):** Conteúdo ocupa 100% da tela
- **Admin:** Sempre fullscreen (100vw × 100vh)
- **Skeleton animation:** `@keyframes pulse` (opacidade 1 → 0.5)

---

## 15. INTEGRAÇÕES EXTERNAS

### 15.1 Facebook/Meta Pixel

- **Carregamento:** SDK em `index.html`
- **Inicialização:** Em `App.tsx` (busca ID da tabela `settings`)
- **Cookie `_fbp`:** Criado no `index.html` se não existir
- **Eventos rastreados:**
  - `PageView` — Na inicialização
  - `Lead` — Ao clicar em link de story
  - Custom events via `trackCustomEvent`
- **Advanced Matching:** Fingerprint, IP, geolocalização (hash SHA256)
- **Compartilhamento de fbp:** Via `postMessage` para iframes

### 15.2 APIs de Geolocalização (fallback em cadeia)

1. `ipapi.co` (100 req/dia grátis)
2. `ip-api.com` (45 req/min grátis)
3. `ipify.org` + `ipinfo.io`

### 15.3 Random User API

- Geração de avatares: `https://randomuser.me/api/portraits/`

---

## 16. FLUXO DE DADOS

### Fluxo do Visitante

```
1. Visitante acessa /instagram/ (ProfileScreen)
   ├── Carrega perfil (cache estático → localStorage → Supabase)
   ├── Carrega posts (mesma estratégia de cache)
   ├── Gera visitor_id (localStorage)
   └── Inicializa Facebook Pixel (tabela settings)

2. Visitante clica no avatar → StoryScreen
   ├── Carrega stories ativos (cache → Supabase)
   ├── Inicia sessão de tracking (beginViewSession)
   │   ├── Gera fingerprint completo
   │   ├── Obtém geolocalização (IP APIs)
   │   └── Verifica visualização existente
   ├── Exibe story com barra de progresso
   ├── Ao sair → commitViewSession (salva métricas)
   └── Ao clicar em link → trackLeadFromStory (Facebook Pixel)

3. Visitante clica em post → PostScreen
   ├── Carrossel de imagens
   ├── Like → salva em post_likes
   └── Comentários → CommentsScreen

4. Visitante clica "Mensagem" → ChatScreen
   ├── Cria/recupera conversa
   ├── Envia mensagens (texto + mídia)
   └── Realtime para respostas do admin
```

### Fluxo do Admin

```
1. Admin acessa /instagram/admin987654321/login
   └── Autentica com credenciais fixas

2. Dashboard → AdminPanelNew
   ├── KPIs em tempo real
   └── Auto-refresh 30s

3. Gerenciamento:
   ├── Stories → StoriesManager (upload, ativar, configurar links)
   ├── Perfil → ProfileManager (editar perfil, CRUD posts)
   ├── Chat → AdminChat (responder visitantes em realtime)
   ├── Comentários → CommentsManager (CRUD fake comments)
   ├── Analytics → AdminStoryAnalytics (gráficos, views detalhadas)
   └── Settings → SettingsManager (Facebook Pixel ID)
```

---

## 17. SEGURANÇA E OBSERVAÇÕES

### ⚠️ Pontos de Atenção

1. **Credenciais admin hardcoded** em `adminAuth.ts`:
   - Email: `admin@gmail.com`
   - Senha: `Matematica123*`
   - Token salvo em localStorage (sem expiração)

2. **Chave Supabase anon exposta** em `supabase.ts`:
   - A chave anon está no código-fonte do frontend
   - Mitigação: Depende das RLS policies do Supabase

3. **RLS policies permissivas:**
   - Todas as tabelas têm acesso público de leitura e escrita
   - Qualquer pessoa com a chave anon pode inserir/atualizar dados
   - **Exceção:** `comments` — INSERT/UPDATE/DELETE apenas para `authenticated`

4. **Storage buckets públicos:**
   - Todos os buckets (`profile-media`, `stories-media`, `chat-media`, `avatars`) têm políticas de leitura/escrita pública

5. **Sem autenticação Supabase:**
   - O projeto não usa Supabase Auth
   - Admin auth é puramente client-side via localStorage

6. **Views com SECURITY DEFINER:**
   - `comments_stats` e `story_view_stats` rodam com privilégios do criador

---

## 18. STORAGE BUCKETS

| Bucket          | Uso                                                   | Policies                    |
| --------------- | ----------------------------------------------------- | --------------------------- |
| `profile-media` | Avatares e imagens de posts + arquivos estáticos JSON | Público (leitura e escrita) |
| `stories-media` | Mídias dos stories (imagens e vídeos)                 | Público                     |
| `chat-media`    | Mídias do chat (imagens, vídeos, áudios)              | Público                     |
| `avatars`       | Avatares de comentários (upload no CommentsManager)   | Público                     |

**Limite de arquivo:** 50MB (validado no frontend)

---

## 19. REALTIME (WEBSOCKET)

### Channels Ativos

| Canal                              | Tabela            | Eventos        | Usado em              |
| ---------------------------------- | ----------------- | -------------- | --------------------- |
| `messages:{conversationId}`        | `messages`        | INSERT         | ChatScreen, AdminChat |
| `conversations`                    | `conversations`   | INSERT, UPDATE | AdminChat             |
| `follow:{visitorId}:{username}`    | `profile_follows` | \*             | useFollow             |
| `post_like:{visitorId}:{postId}`   | `post_likes`      | \*             | usePostLike           |
| `story_like:{visitorId}:{storyId}` | `story_likes`     | \*             | useStoryLike          |
| `comments:{postId}`                | `comments`        | \*             | CommentService        |

**Configuração:** `eventsPerSecond: 10` (definido no cliente Supabase)

---

## 20. MAPA DE ROTAS

### Rotas Públicas (Visitante)

| Rota                     | Componente       | Descrição               |
| ------------------------ | ---------------- | ----------------------- |
| `/`                      | `ProfileScreen`  | Perfil principal        |
| `/post/:postId`          | `PostScreen`     | Post individual         |
| `/post/:postId/comments` | `CommentsScreen` | Comentários do post     |
| `/story`                 | `StoryScreen`    | Visualizador de stories |
| `/chat`                  | `ChatScreen`     | Chat/DM                 |
| `*`                      | `NotFoundScreen` | 404                     |

### Rotas Admin (Protegidas)

| Rota                        | Componente            | Descrição              |
| --------------------------- | --------------------- | ---------------------- |
| `/admin987654321/login`     | `AdminLogin`          | Login                  |
| `/admin987654321`           | `AdminPanelNew`       | Dashboard              |
| `/admin987654321/chat`      | `AdminChat`           | Chat admin             |
| `/admin987654321/stories`   | `StoriesManager`      | Gerenciar stories      |
| `/admin987654321/profile`   | `ProfileManager`      | Gerenciar perfil/posts |
| `/admin987654321/analytics` | `AdminStoryAnalytics` | Analytics              |
| `/admin987654321/comments`  | `CommentsManager`     | Gerenciar comentários  |
| `/admin987654321/settings`  | `SettingsManager`     | Configurações          |

**Nota:** Todas as rotas admin (exceto login) são protegidas pelo `RequireAdminAuth`.
**Base path:** `/instagram/` (configurado no Vite e no BrowserRouter)

---

## RESUMO FINAL

### Números do Projeto

| Métrica                                  | Valor   |
| ---------------------------------------- | ------- |
| **Total de arquivos TS/TSX**             | ~30     |
| **Total de arquivos CSS**                | ~18     |
| **Total de linhas de código (estimado)** | ~8.000+ |
| **Tabelas no banco**                     | 10      |
| **Views no banco**                       | 2       |
| **Triggers**                             | 4       |
| **Storage Buckets**                      | 4       |
| **Dependências de produção**             | 7       |
| **Dependências de desenvolvimento**      | 4       |
| **Rotas públicas**                       | 6       |
| **Rotas admin**                          | 8       |
| **Serviços (classes)**                   | 11      |
| **Hooks customizados**                   | 3       |

### Pontos Fortes

1. Sistema de cache em 3 camadas (estático → localStorage → banco)
2. Tracking de stories extremamente detalhado
3. Fingerprinting robusto com múltiplas técnicas
4. Integração completa com Facebook Pixel + Advanced Matching
5. Chat em tempo real com suporte a mídia
6. Painel admin completo com analytics

### Pontos a Melhorar

1. Autenticação admin deveria usar Supabase Auth
2. Credenciais não devem estar hardcoded
3. RLS policies deveriam ser mais restritivas
4. Storage buckets deveriam ter restrições de escrita
5. Adicionar rate limiting
6. Implementar versionamento de API
