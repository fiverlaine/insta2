# Documentação Completa do Frontend - Projeto Insta2

## 1. Visão Geral do Projeto

Este projeto é uma aplicação web construída com **React** usando **Vite** como build tool. Ele simula uma interface semelhante ao Instagram, integrando funcionalidades de rede social com um sistema de rastreamento de leads e apostas ('betting'). O projeto utiliza **TypeScript** para tipagem estática e **Supabase** como backend (BaaS).

### Tecnologias Principais

- **Core**: React 18, TypeScript, Vite
- **Roteamento**: React Router DOM v6
- **Gerenciamento de Estado/Data Fetching**: TanStack Query (React Query) v5
- **Estilização**: CSS Modules (arquivos `.module.css`)
- **Backend/Banco de Dados**: Supabase (via `@supabase/supabase-js`)
- **Ícones**: Lucide React
- **Gráficos**: Recharts
- **Fingerprinting**: `@fingerprintjs/fingerprintjs` e `ua-parser-js` para identificação de dispositivos.

---

## 2. Estrutura de Diretórios

A estrutura do projeto segue um padrão organizado por funcionalidades, com separação clara entre páginas, componentes, serviços e utilitários.

```
insta2-main/
├── .git/                   # Controle de versão Git
├── assets/                 # Ativos estáticos (imagens, fontes, etc.)
├── dist/                   # Build de produção (gerado pelo Vite)
├── documentation/          # Documentação adicional do projeto
├── node_modules/           # Dependências do projeto
├── public/                 # Arquivos estáticos servidos diretamente
├── src/                    # Código-fonte da aplicação React
│   ├── components/         # Componentes reutilizáveis e layouts
│   ├── hooks/              # Custom Hooks do React
│   ├── lib/                # Configurações de bibliotecas (ex: Supabase client)
│   ├── mocks/              # Dados fictícios para testes/desenvolvimento
│   ├── pages/              # Componentes de página (rotas)
│   ├── services/           # Camada de comunicação com API/Supabase
│   ├── styles/             # Estilos globais e variáves CSS
│   ├── utils/              # Funções utilitárias
│   ├── App.tsx             # Componente raiz com roteamento
│   ├── main.tsx            # Ponto de entrada da aplicação
│   └── vite-env.d.ts       # Declarações de tipos do Vite
├── index.html              # HTML principal da SPA
├── instagram.html          # HTML alternativo (possível landing page ou teste)
├── script-na-bet.html      # Página standalone com scripts de rastreamento/pixel
├── package.json            # Manifesto do projeto e dependências
├── tsconfig.json           # Configuração do TypeScript
└── vite.config.ts          # Configuração do Vite
```

---

## 3. Análise Detalhada dos Módulos

### 3.1. Roteamento (`src/App.tsx`)

O roteamento é gerenciado pelo `react-router-dom` e está dividido em duas áreas principais:

1.  **Área Pública/Usuário (`/`)**:
    - `/`: Feed/Perfil do usuário (`ProfileScreen`).
    - `/post/:postId`: Visualização de post específico (`PostScreen`).
    - `/post/:postId/comments`: Comentários de um post (`CommentsScreen`).
    - `/story`: Visualização de stories (`StoryScreen`). Utiliza um overlay modal se acessado com estado `background`.
    - `/chat`: Interface de chat (`ChatScreen`).
    - `*`: Página 404 (`NotFoundScreen`).

2.  **Área Administrativa (`/admin987654321`)**:
    - Protegida pelo componente `RequireAdminAuth`.
    - Login: `/admin987654321/login` (`AdminLogin`).
    - Dashboard: `/admin987654321` (`AdminPanelNew`).
    - Chat Admin: `/admin987654321/chat` (`AdminChat`).
    - Stories: `/admin987654321/stories` (`StoriesManager`).
    - Perfis: `/admin987654321/profile` (`ProfileManager`).
    - Analytics: `/admin987654321/analytics` (`AdminStoryAnalytics`).
    - Comentários: `/admin987654321/comments` (`CommentsManager`).
    - Configurações: `/admin987654321/settings` (`SettingsManager`).
    - Leads de Apostas: `/admin987654321/bet-leads` (`BetLeads`).

### 3.2. Serviços (`src/services`)

A camada de serviços centraliza a lógica de negócios e interação com o Supabase.

- `authService.ts` / `adminAuth.ts`: Gerenciamento de autenticação.
- `avatarService.ts`: Upload e gestão de avatares.
- `betService.ts`: Lógica relacionada a apostas e integração com PIX/Gateways.
- `chatService.ts`: Envio e recebimento de mensagens em tempo real.
- `commentService.ts`: CRUD de comentários.
- `fingerprintService.ts`: Gera identificadores únicos para visitantes (fingerprinting) para rastreamento sem login.
- `followService.ts`: Funcionalidade de seguir/deixar de seguir.
- `likeService.ts`: Funcionalidade de curtir posts.
- `mediaService.ts`: Upload de mídia (fotos/vídeos).
- `profileService.ts`: Gestão de dados do perfil do usuário.
- `settingsService.ts`: Configurações globais do sistema.
- `storyService.ts`: Criação e visualização de stories.
- `storyViewTrackingService.ts`: Rastreamento complexo de visualizações de stories, evitando contagens duplicadas.

### 3.3. Componentes e Páginas (`src/pages`)

O projeto utiliza uma arquitetura onde a lógica da página e sua apresentação estão frequentemente no mesmo arquivo ou divididas com CSS Modules.

- **User Interface**:
  - `ProfileScreen`: Tela principal que imita o perfil do Instagram.
  - `StoryScreen`: Interface de visualização de stories com navegação temporal e tracking.
  - `ChatScreen`: Chat em tempo real.
- **Admin Interface**:
  - `AdminPanelNew`: Dashboard central.
  - `StoriesManager`: Interface para upload e gestão de stories dos "fakes" ou perfis oficiais.
  - `BetLeads`: Visualização de leads capturados (emails, telefones) e status de depósitos.
  - `CommentsManager`: Moderação de comentários.

### 3.4. Rastreamento e Integrações Especiais

O projeto contém arquivos HTML específicos na raiz para lidar com casos de uso de marketing e redirecionamento.

#### `instagram.html` (Redirecionamento de WebView)

Este arquivo é uma página de aterrissagem projetada para contornar os navegadores internos (WebViews) de aplicativos como Instagram e Facebook.

- **Objetivo**: Forçar o usuário a abrir o link no navegador nativo (Chrome/Safari) ao invés do navegador do app.
- **Mecanismo**:
  - Detecta o User Agent para identificar WebViews.
  - **Android**: Tenta usar `intent://` scheme para abrir o Chrome diretamente.
  - **iOS/Outros**: Mostra uma interface de fallback instruindo o usuário a clicar em "Abrir no Navegador".
- **Destino**: Redireciona para `https://storiesbug.netlify.app/` mantendo os parâmetros UTM.

#### `script-na-bet.html` (Pixel & Tracking)

Este arquivo atua como uma landing page de integração ou um script injetável que contém a lógica pesada de rastreamento.

- **Pixel UTMify**: Integração com script externo de tracking.
- **TrackTelegram**: Script personalizado para rastrear usuários e enviar dados para uma API no Vercel.
- **Supabase Webhook**: Intercepta interações de formulário e requisições de rede (fetch) para capturar:
  - Geração de PIX (`gerar_pix`).
  - Confirmação de Pagamento (`verifica_pagamento`).
  - Cadastros (email, telefone).
- **Hydration**: Sistema para manter a identidade do usuário (persistência de dados UTM) mesmo após recarregamentos ou trocas de página.

### 3.5. Estilização

O projeto utiliza **CSS Modules** (`.module.css`). Isso garante escopo local para as classes CSS, evitando conflitos de nomes globais. Arquivos como `App.module.css`, `AdminLayout.module.css` e arquivos CSS específicos para cada página contêm as regras de estilo.

---

## 4. Fluxo de Dados

1.  **Frontend**: O usuário interage com a interface (React).
2.  **Services**: As ações disparam chamadas nos serviços (`src/services`).
3.  **Supabase Client**: Os serviços usam o cliente do Supabase para fazer requisições HTTP/WebSocket ao backend.
4.  **Database**: O Supabase processa as queries no PostgreSQL.
5.  **Realtime**: Para chat e notificações, o Supabase Realtime é utilizado para atualizar a interface instantaneamente.

## 5. Scripts Disponíveis (package.json)

- `npm run dev`: Inicia o servidor de desenvolvimento (Vite).
- `npm run build`: Gera o build de produção na pasta `dist`.
- `npm run preview`: Visualiza o build de produção localmente.

## 6. Observações Importantes

- **Autenticação Admin**: A rota de admin é protegida e requer login específico. O "código" ou ID na URL `/admin987654321` sugere uma tentativa de ofuscação da rota de administração.
- **Fingerprinting**: O sistema de rastreamento é robusto, tentando identificar usuários únicos mesmo sem login explícito, o que é crucial para a atribuição de leads de apostas.
- **Design**: A interface é fortemente inspirada no Instagram mobile, focada em visualização vertical (mobile-first).
