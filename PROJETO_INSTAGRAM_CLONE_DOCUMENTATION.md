# Documentação Completa - Instagram Clone

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tecnologias e Dependências](#tecnologias-e-dependências)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Configuração e Setup](#configuração-e-setup)
5. [Arquitetura](#arquitetura)
6. [Funcionalidades](#funcionalidades)
7. [Serviços](#serviços)
8. [Páginas e Componentes](#páginas-e-componentes)
9. [Hooks Customizados](#hooks-customizados)
10. [Utilitários](#utilitários)
11. [Integração com Supabase](#integração-com-supabase)
12. [Sistema de Cache](#sistema-de-cache)
13. [Analytics e Tracking](#analytics-e-tracking)
14. [Sistema de Autenticação Admin](#sistema-de-autenticação-admin)
15. [Roteamento](#roteamento)
16. [Estilização](#estilização)
17. [Build e Deploy](#build-e-deploy)
18. [Scripts Disponíveis](#scripts-disponíveis)

---

## 🎯 Visão Geral

Este é um clone completo do Instagram desenvolvido em React + TypeScript, utilizando Supabase como backend. O projeto replica as principais funcionalidades do Instagram, incluindo:

- **Perfil de Usuário**: Visualização de perfil com posts, stories, seguidores e seguindo
- **Posts**: Feed de posts com múltiplas imagens, curtidas e comentários
- **Stories**: Sistema de stories com suporte a imagens e vídeos
- **Chat**: Sistema de mensagens diretas em tempo real
- **Comentários**: Sistema de comentários com respostas aninhadas (threads)
- **Painel Admin**: Interface administrativa completa para gerenciar conteúdo
- **Analytics**: Sistema avançado de analytics para stories com fingerprinting

### Características Principais

- ✅ **Performance Otimizada**: Sistema de cache multi-camadas (localStorage + arquivos estáticos)
- ✅ **Tempo Real**: Integração com Supabase Realtime para chat e atualizações
- ✅ **Analytics Avançado**: Tracking detalhado de visualizações com fingerprinting
- ✅ **Responsivo**: Design mobile-first com suporte a desktop
- ✅ **TypeScript**: Tipagem completa para maior segurança
- ✅ **Facebook Pixel**: Integração com Meta Pixel para tracking de eventos

---

## 🛠️ Tecnologias e Dependências

### Core
- **React** 18.3.1 - Biblioteca UI
- **TypeScript** 5.5.4 - Tipagem estática
- **Vite** 5.4.3 - Build tool e dev server
- **React Router DOM** 6.26.0 - Roteamento

### Backend/API
- **@supabase/supabase-js** 2.79.0 - Cliente Supabase
- **@tanstack/react-query** 5.83.0 - Gerenciamento de estado e cache de queries

### UI/UX
- **lucide-react** 0.427.0 - Ícones
- **recharts** 3.3.0 - Gráficos para analytics

### Analytics e Tracking
- **@fingerprintjs/fingerprintjs** 5.0.1 - Fingerprinting de visitantes
- **ua-parser-js** 2.0.6 - Parser de User Agent

### Dev Dependencies
- **@vitejs/plugin-react** 4.3.1 - Plugin React para Vite
- **@types/react** 18.3.3 - Tipos TypeScript para React
- **@types/react-dom** 18.3.0 - Tipos TypeScript para React DOM
- **eslint** - Linter (configuração mínima)

---

## 📁 Estrutura do Projeto

```
INSTA 2/
├── assets/                    # Assets estáticos
│   └── images/               # Imagens (ícones, posts, perfil)
├── constants/                # Constantes
│   └── colors.ts            # Paleta de cores
├── dist/                     # Build de produção
├── documentation/            # Documentação
│   └── backend.md           # Documentação do backend
├── node_modules/            # Dependências
├── public/                  # Arquivos públicos
│   ├── assets/             # Assets públicos
│   └── _redirects          # Configuração de redirects (Netlify)
├── src/
│   ├── components/         # Componentes React
│   │   └── RequireAdminAuth.tsx
│   ├── hooks/              # Hooks customizados
│   │   ├── useFollow.ts
│   │   ├── usePostLike.ts
│   │   └── useStoryLike.ts
│   ├── lib/                # Bibliotecas/configurações
│   │   └── supabase.ts    # Cliente Supabase
│   ├── mocks/              # Dados mock (para desenvolvimento)
│   │   ├── comments.ts
│   │   ├── profile.ts
│   │   └── stories.ts
│   ├── pages/              # Páginas/Views
│   │   ├── ProfileScreen.tsx
│   │   ├── PostScreen.tsx
│   │   ├── StoryScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── CommentsScreen.tsx
│   │   ├── AdminPanelNew.tsx
│   │   ├── AdminChat.tsx
│   │   ├── AdminLogin.tsx
│   │   ├── StoriesManager.tsx
│   │   ├── ProfileManager.tsx
│   │   ├── CommentsManager.tsx
│   │   ├── AdminStoryAnalytics.tsx
│   │   └── NotFoundScreen.tsx
│   ├── services/           # Serviços de negócio
│   │   ├── profileService.ts
│   │   ├── storyService.ts
│   │   ├── chatService.ts
│   │   ├── commentService.ts
│   │   ├── followService.ts
│   │   ├── likeService.ts
│   │   ├── mediaService.ts
│   │   ├── avatarService.ts
│   │   ├── fingerprintService.ts
│   │   └── storyViewTrackingService.ts
│   ├── styles/             # Estilos globais
│   │   └── index.css
│   ├── utils/              # Utilitários
│   │   ├── adminAuth.ts
│   │   ├── visitor.ts
│   │   ├── cacheBuster.ts
│   │   ├── dataNormalization.ts
│   │   └── facebookPixel.ts
│   ├── App.tsx             # Componente raiz
│   ├── App.module.css      # Estilos do App
│   ├── main.tsx            # Entry point
│   └── vite-env.d.ts       # Tipos do Vite
├── .gitignore
├── eslint.config.js
├── index.html              # HTML principal
├── package.json
├── package-lock.json
├── tsconfig.json           # Configuração TypeScript
├── tsconfig.node.json      # Configuração TypeScript para Node
├── vite.config.ts          # Configuração Vite
└── SUPABASE_INSTAGRAM_DOCUMENTATION.md  # Documentação do Supabase
```

---

## ⚙️ Configuração e Setup

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta Supabase

### Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd "INSTA 2"
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Supabase**
   - Edite `src/lib/supabase.ts` com suas credenciais:
   ```typescript
   const supabaseUrl = 'https://seu-projeto.supabase.co';
   const supabaseAnonKey = 'sua-chave-anon';
   ```

4. **Execute o projeto em desenvolvimento**
```bash
npm run dev
```

5. **Build para produção**
```bash
npm run build
```

6. **Preview do build**
```bash
npm run preview
```

---

## 🏗️ Arquitetura

### Padrão de Arquitetura

O projeto segue uma arquitetura em camadas:

```
┌─────────────────────────────────────┐
│         Páginas (UI Layer)          │
│  (ProfileScreen, PostScreen, etc)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Hooks (State Management)       │
│  (useFollow, usePostLike, etc)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Serviços (Business Logic)      │
│  (ProfileService, StoryService)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Supabase (Data Layer)          │
│  (Database, Storage, Realtime)      │
└─────────────────────────────────────┘
```

### Fluxo de Dados

1. **Páginas** renderizam UI e capturam interações do usuário
2. **Hooks** gerenciam estado local e chamam serviços
3. **Serviços** contêm lógica de negócio e comunicação com Supabase
4. **Supabase** armazena dados e fornece realtime

### Sistema de Cache

O projeto implementa um sistema de cache em 3 camadas:

1. **Cache Síncrono (localStorage)**: Carregamento instantâneo de dados em cache
2. **Arquivos Estáticos (Supabase Storage)**: JSON estáticos para carregamento rápido
3. **Supabase Database**: Fonte de verdade, atualizado em background

---

## 🎨 Funcionalidades

### 1. Perfil de Usuário (`ProfileScreen`)

**Funcionalidades:**
- Visualização de perfil com avatar, nome, bio e link
- Contadores de seguidores, seguindo e posts
- Botão de seguir/seguindo
- Grid de posts
- Navegação para stories
- Navegação para posts individuais

**Características:**
- Carregamento instantâneo via cache
- Atualização em tempo real de contadores
- Design responsivo mobile-first

### 2. Posts (`PostScreen`)

**Funcionalidades:**
- Visualização de post individual
- Galeria de imagens (swipe)
- Sistema de curtidas
- Contador de comentários
- Navegação para tela de comentários
- Legenda do post

**Características:**
- Suporte a múltiplas imagens por post
- Animações suaves
- Cache de estado de curtidas

### 3. Stories (`StoryScreen`)

**Funcionalidades:**
- Visualização de stories em sequência
- Suporte a imagens e vídeos
- Navegação entre stories (swipe)
- Botão de link invisível (para tracking)
- Sistema de curtidas
- Resposta via chat

**Características:**
- Auto-avanço com timer
- Tracking detalhado de visualizações
- Analytics avançado com fingerprinting
- Suporte a thumbnails

### 4. Chat (`ChatScreen`)

**Funcionalidades:**
- Mensagens em tempo real
- Envio de mídia (imagem, vídeo, áudio, documento)
- Resposta a stories
- Indicador de não lidas
- Histórico de mensagens

**Características:**
- Integração com Supabase Realtime
- Upload de arquivos para Supabase Storage
- Interface similar ao Instagram

### 5. Comentários (`CommentsScreen`)

**Funcionalidades:**
- Lista de comentários
- Sistema de respostas (threads)
- Curtidas em comentários
- Avatares de usuários
- Tempo relativo ("Agora", "2h", etc)

**Características:**
- Hierarquia de comentários aninhados
- Atualização em tempo real
- Interface intuitiva

### 6. Painel Admin

#### 6.1 Dashboard (`AdminPanelNew`)

**Funcionalidades:**
- Visão geral de estatísticas
- Cards com métricas principais
- Navegação para módulos específicos
- Atualização automática de stats

**Métricas Exibidas:**
- Total de posts
- Total de stories
- Total de visualizações
- Visualizações únicas
- Total de conversas
- Mensagens não lidas

#### 6.2 Gerenciador de Perfil (`ProfileManager`)

**Funcionalidades:**
- Edição de informações do perfil
- Upload de avatar
- Edição de bio (array de strings)
- Edição de link externo
- Atualização de contadores

#### 6.3 Gerenciador de Posts

**Funcionalidades:**
- Lista de todos os posts
- Criar novo post
- Editar post existente
- Deletar post
- Ativar/desativar post
- Reordenar posts (drag & drop)
- Upload de múltiplas imagens

#### 6.4 Gerenciador de Stories (`StoriesManager`)

**Funcionalidades:**
- Lista de todos os stories
- Criar novo story
- Upload de mídia (imagem/vídeo)
- Editar story
- Deletar story
- Ativar/desativar story
- Reordenar stories
- Ativar/desativar botão de link

#### 6.5 Analytics de Stories (`AdminStoryAnalytics`)

**Funcionalidades:**
- Estatísticas detalhadas por story
- Gráficos de visualizações
- Distribuição por país
- Distribuição por dispositivo
- Mapa de visualizações por cidade
- Métricas de engajamento
- Taxa de conclusão
- Tempo médio assistido

**Métricas Disponíveis:**
- Visualizações únicas
- Total de visualizações
- IPs únicos
- Visitantes únicos
- Países distintos
- Cidades distintas
- Tipos de dispositivos
- Visualizações nas últimas 24h
- Visualizações completas
- Taxa de conclusão (%)
- Tempo médio assistido
- Percentual médio visualizado

#### 6.6 Gerenciador de Comentários (`CommentsManager`)

**Funcionalidades:**
- Lista de todos os comentários
- Filtrar por post
- Editar comentário
- Deletar comentário
- Gerenciar respostas
- Upload de avatares personalizados

#### 6.7 Chat Admin (`AdminChat`)

**Funcionalidades:**
- Lista de conversas
- Visualização de mensagens
- Envio de mensagens como admin
- Envio de mídia
- Resposta a stories
- Indicador de não lidas
- Atualização em tempo real

---

## 🔧 Serviços

### ProfileService

**Localização**: `src/services/profileService.ts`

**Responsabilidades:**
- Gerenciamento de perfil (CRUD)
- Gerenciamento de posts (CRUD)
- Upload de avatares e imagens
- Sistema de cache
- Geração de arquivos estáticos

**Métodos Principais:**
- `getProfile()` - Busca perfil (com cache)
- `updateProfile()` - Atualiza perfil
- `uploadAvatar()` - Upload de avatar
- `getPosts()` - Busca posts (com cache)
- `createPost()` - Cria novo post
- `updatePost()` - Atualiza post
- `deletePost()` - Deleta post
- `reorderPosts()` - Reordena posts
- `generateStaticFiles()` - Gera arquivos JSON estáticos

**Cache:**
- Cache no localStorage (5 minutos)
- Arquivos estáticos no Supabase Storage
- Carregamento síncrono de cache expirado

### StoryService

**Localização**: `src/services/storyService.ts`

**Responsabilidades:**
- Gerenciamento de stories (CRUD)
- Upload de mídia
- Sistema de cache

**Métodos Principais:**
- `getActiveStories()` - Busca stories ativos (com cache)
- `getAllStories()` - Busca todos os stories (admin)
- `createStory()` - Cria novo story
- `uploadStoryMedia()` - Upload de mídia
- `deleteStory()` - Deleta story
- `toggleStoryActive()` - Ativa/desativa story
- `toggleStoryLink()` - Ativa/desativa botão de link
- `reorderStories()` - Reordena stories
- `getVideoDuration()` - Detecta duração de vídeo

**Cache:**
- Cache no localStorage (5 minutos)
- Limpeza automática após modificações

### ChatService

**Localização**: `src/services/chatService.ts`

**Responsabilidades:**
- Gerenciamento de conversas
- Envio/recebimento de mensagens
- Integração com Realtime

**Classes:**
- `ChatService` - Para visitantes
- `AdminChatService` - Para admin

**Métodos Principais:**
- `getOrCreateConversation()` - Obtém ou cria conversa
- `sendMessage()` - Envia mensagem
- `getMessages()` - Busca mensagens
- `subscribeToMessages()` - Subscribe em tempo real
- `markAsRead()` - Marca como lidas

### CommentService

**Localização**: `src/services/commentService.ts`

**Responsabilidades:**
- Gerenciamento de comentários
- Sistema de respostas (threads)
- Estatísticas de comentários

**Métodos Principais:**
- `getCommentsByPost()` - Busca comentários (com hierarquia)
- `createComment()` - Cria comentário
- `updateComment()` - Atualiza comentário
- `deleteComment()` - Deleta comentário
- `countComments()` - Conta comentários
- `subscribeToComments()` - Subscribe em tempo real

### FollowService

**Localização**: `src/services/followService.ts`

**Responsabilidades:**
- Gerenciamento de follow/unfollow
- Cache de estado

**Métodos Principais:**
- `isFollowing()` - Verifica se está seguindo
- `toggleFollow()` - Alterna follow/unfollow
- `subscribeToFollow()` - Subscribe em tempo real

**Cache:**
- Cache síncrono no localStorage

### LikeService

**Localização**: `src/services/likeService.ts`

**Responsabilidades:**
- Gerenciamento de curtidas (posts e stories)
- Cache de estado

**Métodos Principais:**
- `isPostLiked()` - Verifica se post foi curtido
- `togglePostLike()` - Alterna curtida de post
- `isStoryLiked()` - Verifica se story foi curtido
- `toggleStoryLike()` - Alterna curtida de story
- `subscribeToPostLike()` - Subscribe em tempo real
- `subscribeToStoryLike()` - Subscribe em tempo real

**Cache:**
- Cache síncrono no localStorage

### StoryViewTrackingService

**Localização**: `src/services/storyViewTrackingService.ts`

**Responsabilidades:**
- Tracking detalhado de visualizações
- Analytics avançado
- Fingerprinting

**Métodos Principais:**
- `beginViewSession()` - Inicia sessão de visualização
- `commitViewSession()` - Finaliza/atualiza sessão
- `getStoryStats()` - Obtém estatísticas agregadas
- `getStoryViews()` - Obtém todas as visualizações
- `getViewsByCountry()` - Agrupa por país
- `getViewsByDevice()` - Agrupa por dispositivo
- `getViewsByCity()` - Agrupa por cidade (com coordenadas)

**Dados Coletados:**
- Geolocalização (IP, país, cidade, região, coordenadas)
- Dispositivo (tipo, modelo, fabricante)
- Browser/OS (navegador, versão, SO, versão)
- Fingerprints (canvas, WebGL, áudio, fontes)
- Tela (resolução, profundidade de cor, pixel ratio)
- Idioma (idioma, timezone)
- Métricas (tempo assistido, percentual visualizado, eventos de reprodução)

### FingerprintService

**Localização**: `src/services/fingerprintService.ts`

**Responsabilidades:**
- Geração de fingerprint único
- Coleta de informações do visitante
- Geolocalização via IP

**Métodos Principais:**
- `generateFingerprint()` - Gera fingerprint completo

**Dados Coletados:**
- Fingerprint principal (FingerprintJS)
- Geolocalização (múltiplas APIs de fallback)
- Informações de dispositivo (UAParser)
- Fingerprints avançados (Canvas, WebGL, Áudio, Fontes)
- Informações de tela
- Informações de idioma

**APIs de Geolocalização:**
1. ipapi.co (100 req/dia grátis)
2. ip-api.com (45 req/min grátis)
3. ipify.org + ipinfo.io (fallback)

**Cache:**
- Cache de geolocalização (1 hora)

### MediaService

**Localização**: `src/services/mediaService.ts`

**Responsabilidades:**
- Upload de mídia para chat
- Validação de arquivos
- Geração de thumbnails

**Métodos Principais:**
- `uploadFile()` - Upload de arquivo
- `getFileType()` - Detecta tipo de arquivo
- `generateThumbnail()` - Gera thumbnail

### AvatarService

**Localização**: `src/services/avatarService.ts`

**Responsabilidades:**
- Geração de avatares aleatórios
- Avatares consistentes por nome

**Métodos Principais:**
- `getRandomAvatar()` - Avatar aleatório
- `getAvatarByName()` - Avatar consistente por nome
- `getMultipleAvatars()` - Múltiplos avatares

**Fonte:**
- Random User API (https://randomuser.me)

---

## 📄 Páginas e Componentes

### Páginas Públicas

#### ProfileScreen
- **Rota**: `/`
- **Descrição**: Tela principal de perfil
- **Funcionalidades**: Ver perfil, posts, seguir, navegar para stories

#### PostScreen
- **Rota**: `/post/:postId`
- **Descrição**: Visualização de post individual
- **Funcionalidades**: Ver post, curtir, ver comentários

#### StoryScreen
- **Rota**: `/story`
- **Descrição**: Visualização de stories
- **Funcionalidades**: Ver stories, navegar, curtir, responder

#### ChatScreen
- **Rota**: `/chat`
- **Descrição**: Chat do visitante
- **Funcionalidades**: Enviar mensagens, mídia, responder stories

#### CommentsScreen
- **Rota**: `/post/:postId/comments`
- **Descrição**: Tela de comentários
- **Funcionalidades**: Ver comentários, criar, responder

#### NotFoundScreen
- **Rota**: `*` (catch-all)
- **Descrição**: Página 404

### Páginas Admin

#### AdminLogin
- **Rota**: `/admin987654321/login`
- **Descrição**: Login do admin
- **Credenciais**: Ver `src/utils/adminAuth.ts`

#### AdminPanelNew
- **Rota**: `/admin987654321`
- **Descrição**: Dashboard principal
- **Proteção**: RequireAdminAuth

#### AdminChat
- **Rota**: `/admin987654321/chat`
- **Descrição**: Chat admin
- **Proteção**: RequireAdminAuth

#### StoriesManager
- **Rota**: `/admin987654321/stories`
- **Descrição**: Gerenciador de stories
- **Proteção**: RequireAdminAuth

#### ProfileManager
- **Rota**: `/admin987654321/profile`
- **Descrição**: Gerenciador de perfil
- **Proteção**: RequireAdminAuth

#### AdminStoryAnalytics
- **Rota**: `/admin987654321/analytics`
- **Descrição**: Analytics de stories
- **Proteção**: RequireAdminAuth

#### CommentsManager
- **Rota**: `/admin987654321/comments`
- **Descrição**: Gerenciador de comentários
- **Proteção**: RequireAdminAuth

### Componentes

#### RequireAdminAuth
- **Localização**: `src/components/RequireAdminAuth.tsx`
- **Descrição**: HOC para proteger rotas admin
- **Funcionalidade**: Redireciona para login se não autenticado

---

## 🎣 Hooks Customizados

### useFollow

**Localização**: `src/hooks/useFollow.ts`

**Uso:**
```typescript
const { isFollowing, loading, toggleFollow } = useFollow(profileUsername);
```

**Retorna:**
- `isFollowing`: boolean - Estado atual
- `loading`: boolean - Estado de carregamento
- `toggleFollow`: function - Alterna follow/unfollow

**Características:**
- Cache síncrono para carregamento instantâneo
- Subscribe em tempo real
- Atualização otimista

### usePostLike

**Localização**: `src/hooks/usePostLike.ts`

**Uso:**
```typescript
const { isLiked, likesCount, loading, toggleLike } = usePostLike(postId, baseLikes);
```

**Retorna:**
- `isLiked`: boolean - Estado atual
- `likesCount`: number - Contador atualizado
- `loading`: boolean - Estado de carregamento
- `toggleLike`: function - Alterna curtida

**Características:**
- Cache síncrono
- Subscribe em tempo real
- Atualização de contador

### useStoryLike

**Localização**: `src/hooks/useStoryLike.ts`

**Uso:**
```typescript
const { isLiked, loading, toggleLike } = useStoryLike(storyId);
```

**Retorna:**
- `isLiked`: boolean - Estado atual
- `loading`: boolean - Estado de carregamento
- `toggleLike`: function - Alterna curtida

**Características:**
- Similar ao usePostLike
- Otimizado para stories

---

## 🛠️ Utilitários

### adminAuth

**Localização**: `src/utils/adminAuth.ts`

**Funcionalidades:**
- Autenticação simples baseada em localStorage
- Credenciais hardcoded (não recomendado para produção)

**Métodos:**
- `isAdminAuthenticated()` - Verifica autenticação
- `authenticateAdmin()` - Autentica admin
- `logoutAdmin()` - Faz logout

**Credenciais:**
- Email: `admin@gmail.com`
- Senha: `Matematica123*`

⚠️ **Atenção**: Em produção, usar autenticação adequada (Supabase Auth, JWT, etc.)

### visitor

**Localização**: `src/utils/visitor.ts`

**Funcionalidades:**
- Geração de ID único para visitante
- Persistência no localStorage

**Métodos:**
- `getVisitorId()` - Obtém ou cria ID do visitante
- `clearVisitorId()` - Limpa ID (para testes)

### cacheBuster

**Localização**: `src/utils/cacheBuster.ts`

**Funcionalidades:**
- Limpeza de cache
- Cache busting de URLs
- Pré-carregamento de imagens

**Métodos:**
- `clearAllCache()` - Limpa todo cache
- `addCacheBuster()` - Adiciona timestamp à URL
- `preloadImage()` - Pré-carrega imagem
- `preloadImages()` - Pré-carrega múltiplas imagens

### dataNormalization

**Localização**: `src/utils/dataNormalization.ts`

**Funcionalidades:**
- Normalização de dados para Meta Pixel
- Hash SHA256

**Métodos:**
- `normalizeEmail()` - Normaliza email
- `normalizePhone()` - Normaliza telefone
- `hashSHA256()` - Aplica hash SHA256
- `hashEmail()`, `hashPhone()`, etc. - Normaliza e hasheia

### facebookPixel

**Localização**: `src/utils/facebookPixel.ts`

**Funcionalidades:**
- Rastreamento de eventos do Meta Pixel
- Advanced Matching Parameters
- Custom Parameters

**Métodos:**
- `trackEvent()` - Rastreia evento padrão
- `trackCustomEvent()` - Rastreia evento customizado
- `trackLeadFromStory()` - Rastreia lead de story

**Eventos Rastreados:**
- PageView (automático no index.html)
- Lead (quando clica no link do story)
- Eventos customizados

---

## 🔌 Integração com Supabase

### Configuração

**Arquivo**: `src/lib/supabase.ts`

```typescript
const supabaseUrl = 'https://xqngslfzxszkwgtqtwua.supabase.co';
const supabaseAnonKey = '...';
```

### Recursos Utilizados

1. **Database**
   - Tabelas: profile_settings, posts, stories, comments, etc.
   - Views: comments_stats, story_view_stats
   - Functions: set_updated_at, update_conversation_on_message
   - Triggers: Automáticos para updated_at

2. **Storage**
   - Bucket: `profile-media` (perfil, posts, arquivos estáticos)
   - Bucket: `stories-media` (mídia de stories)
   - Bucket: `chat-media` (anexos de chat)
   - Bucket: `avatars` (avatares de comentários)

3. **Realtime**
   - Canal: `messages` (mensagens em tempo real)
   - Canal: `conversations` (atualizações de conversas)
   - Canal: `comments` (novos comentários)
   - Canal: `follows` (mudanças de follow)
   - Canal: `likes` (mudanças de curtidas)

### Row Level Security (RLS)

- Todas as tabelas têm RLS habilitado
- Políticas públicas permitem acesso total (anon)
- ⚠️ Em produção, considerar políticas mais restritivas

---

## 💾 Sistema de Cache

### Estratégia de Cache

O projeto implementa cache em múltiplas camadas:

1. **Cache Síncrono (localStorage)**
   - Carregamento instantâneo (~0ms)
   - Dados expirados ainda são retornados para UX
   - Atualização em background

2. **Arquivos Estáticos (Supabase Storage)**
   - JSON estáticos para perfil e posts
   - Carregamento rápido sem query no banco
   - Gerados automaticamente após atualizações

3. **Cache de Queries (React Query)**
   - Cache automático de queries
   - Invalidação inteligente
   - Refetch em background

### Duração de Cache

- **localStorage**: 5 minutos
- **Arquivos Estáticos**: Até próxima atualização
- **React Query**: Configuração padrão

### Limpeza de Cache

- Automática após modificações (create, update, delete)
- Manual via `clearAllCaches()` nos serviços
- Limpeza seletiva por tipo de dado

---

## 📊 Analytics e Tracking

### Facebook Pixel (Meta Pixel)

**ID do Pixel**: `621469384370793`

**Configuração**: `index.html`

**Eventos Rastreados:**
- PageView (automático)
- Lead (clique em link de story)
- Eventos customizados

**Advanced Matching:**
- External ID (visitor ID hasheado)
- Cidade, Estado, País (hasheados)
- IP Address
- User Agent
- Facebook Browser ID (_fbp)
- Facebook Click ID (_fbc)

### Story Analytics

**Dados Coletados:**
- Visualizações únicas e totais
- Geolocalização (país, cidade, coordenadas)
- Dispositivo (tipo, modelo, fabricante)
- Browser/OS
- Fingerprints (canvas, WebGL, áudio, fontes)
- Métricas de engajamento (tempo, percentual, conclusão)
- Eventos de reprodução

**APIs Utilizadas:**
- FingerprintJS (fingerprinting)
- ipapi.co / ip-api.com / ipinfo.io (geolocalização)
- UAParser (device info)

---

## 🔐 Sistema de Autenticação Admin

### Implementação Atual

- Autenticação simples baseada em localStorage
- Credenciais hardcoded
- Sem expiração de sessão

### Credenciais

- Email: `admin@gmail.com`
- Senha: `Matematica123*`

### Proteção de Rotas

- Componente `RequireAdminAuth` protege rotas admin
- Redireciona para `/admin987654321/login` se não autenticado
- Mantém URL de destino para redirect após login

### Recomendações para Produção

1. Implementar Supabase Auth
2. Usar JWT tokens
3. Adicionar expiração de sessão
4. Implementar refresh tokens
5. Adicionar 2FA (opcional)

---

## 🗺️ Roteamento

### Configuração

**Arquivo**: `src/App.tsx`

**Biblioteca**: React Router DOM v6

### Rotas Públicas

```
/ → ProfileScreen
/post/:postId → PostScreen
/post/:postId/comments → CommentsScreen
/story → StoryScreen
/chat → ChatScreen
* → NotFoundScreen
```

### Rotas Admin

```
/admin987654321/login → AdminLogin
/admin987654321 → AdminPanelNew (protegida)
/admin987654321/chat → AdminChat (protegida)
/admin987654321/stories → StoriesManager (protegida)
/admin987654321/profile → ProfileManager (protegida)
/admin987654321/analytics → AdminStoryAnalytics (protegida)
/admin987654321/comments → CommentsManager (protegida)
```

### Query Client

- React Query configurado globalmente
- Cache compartilhado entre rotas

---

## 🎨 Estilização

### CSS Modules

- Cada página tem seu arquivo `.module.css`
- Escopo local de estilos
- Sem conflitos de nomes

### Estilos Globais

**Arquivo**: `src/styles/index.css`

**Características:**
- Reset CSS básico
- Variáveis de cores
- Tipografia
- Layout responsivo
- Animações

### Design System

**Cores:**
- Background: `#1a1a1a` / `#000`
- Texto: `#fff`
- Accent: `#2f95dc`

**Layout:**
- Mobile-first
- Max-width 480px no desktop (simula mobile)
- Admin sempre fullscreen

### Responsividade

- Mobile: 100% width
- Desktop: Container centralizado (480px)
- Admin: Sempre fullscreen

---

## 🚀 Build e Deploy

### Build

```bash
npm run build
```

**Output**: `dist/`

**Conteúdo:**
- HTML otimizado
- JavaScript bundle
- CSS bundle
- Assets estáticos

### Deploy

**Netlify:**
- Arquivo `_redirects` configurado
- SPA routing suportado

**Vercel:**
- Configuração automática
- SPA routing suportado

**Outros:**
- Qualquer servidor estático
- Configurar SPA routing

### Variáveis de Ambiente

Atualmente, as credenciais do Supabase estão hardcoded. Para produção:

1. Criar arquivo `.env`:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave
```

2. Atualizar `src/lib/supabase.ts`:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

## 📜 Scripts Disponíveis

### npm run dev
- Inicia servidor de desenvolvimento
- Hot Module Replacement (HMR)
- Porta padrão: 5173

### npm run build
- Compila para produção
- TypeScript check
- Otimizações automáticas

### npm run preview
- Preview do build de produção
- Testa build localmente

---

## 📝 Notas Importantes

### Segurança

⚠️ **Atenções:**
- Credenciais hardcoded (admin e Supabase)
- RLS com políticas públicas (acesso total)
- Sem validação de uploads no frontend
- Sem rate limiting

**Recomendações:**
- Mover credenciais para variáveis de ambiente
- Implementar autenticação adequada
- Adicionar validação de uploads
- Implementar rate limiting
- Revisar políticas RLS

### Performance

✅ **Otimizações Implementadas:**
- Cache multi-camadas
- Arquivos estáticos
- Lazy loading de imagens
- Pré-carregamento de stories
- React Query para cache de queries

### Escalabilidade

**Considerações:**
- Supabase escala automaticamente
- Cache reduz carga no banco
- Arquivos estáticos reduzem queries
- Realtime eficiente para chat

### Manutenção

**Checklist:**
- [ ] Rotacionar chaves do Supabase periodicamente
- [ ] Atualizar dependências regularmente
- [ ] Monitorar uso de storage
- [ ] Revisar logs de erros
- [ ] Backup do banco de dados

---

## 🔗 Links Úteis

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Documentação Supabase**: https://supabase.com/docs
- **React Query Docs**: https://tanstack.com/query
- **Vite Docs**: https://vitejs.dev
- **React Router Docs**: https://reactrouter.com

---

## 📅 Última Atualização

**Data**: 2025-01-27
**Versão**: 1.0.0
**Autor**: Documentação gerada automaticamente

---

*Esta documentação foi gerada através de análise completa do código-fonte do projeto.*

