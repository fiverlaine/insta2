# Documentação Completa do Backend - Projeto Buginsta

## 1. Visão Geral do Backend

O backend deste projeto é construído sobre o **Supabase** (PostgreSQL + Edge Functions). O projeto principal identificado é o **buginsta** (ID: `izuspwvgvozwdjzbrpvt`).

O sistema atende a três domínios principais:

1.  **Rede Social (Insta Clone)**: Gerenciamento de posts, stories, comentários e perfis.
2.  **Rastreamento de Apostas (Betting)**: Captura de leads, depósitos via PIX e integração com plataformas de afiliação (UTMify).
3.  **Chat/Suporte**: Sistema de mensagens em tempo real entre visitantes e admin.

---

## 2. Banco de Dados (PostgreSQL)

O esquema do banco de dados (`public` schema) contém as seguintes tabelas principais:

### 2.1. Módulo de Apostas & Tracking (Crítico)

Este módulo é responsável pela atribuição de marketing e gestão financeira dos leads.

- **`bet_leads`**: Tabela central de usuários capturados.
  - **Colunas Principais**: `id`, `email`, `phone`, `document` (CPF), `visitor_id`, `fingerprint`.
  - **Tracking**: `utmify` (parâmetro chave), `fbc`, `fbp` (Facebook Pixel), `utm_source`, `utm_medium`, etc.
  - **Status**: `status` (ex: 'deposited'), `deposit_value`, `deposit_at`.
  - **Objetivo**: Armazenar a identidade do lead e seus parâmetros de origem para atribuição correta (LTV, ROI).

- **`deposits`**: Registro de transações financeiras.
  - **Colunas Principais**: `txid` (ID da transação PIX), `amount`, `status` (ex: 'paid', 'waiting_payment'), `lead_id` (FK).
  - **Metadados**: `metadata` (JSONB para dados extras como `pix_created_at`), `utmify_created_at`.
  - **Tracking**: Copia os dados de rastreamento (`utm_source`, `utmify`, etc.) do lead no momento da criação para congelar a atribuição daquela venda específica.

### 2.2. Módulo Social (Insta Clone)

Simula a estrutura de dados de uma rede social.

- **Conteúdo**:
  - `posts`: Feed de publicações.
  - `stories`: Stories temporários (fotos/vídeos).
  - `comments`: Comentários em posts.
- **Interações**:
  - `post_likes`, `story_likes`: Registro de curtidas.
  - `story_views`: Quem visualizou quais stories.
  - `story_view_stats`: Agregações ou estatísticas de visualização.
  - `profile_follows`: Relacionamento de seguidores.
- **Perfil**:
  - `profiles` (provável, não listada explicitamente mas inferida como 'user_fn...' ou tabelas públicas de usuários).
  - `profile_settings`, `settings`: Configurações de aparência e conta.

### 2.3. Módulo de Chat

- `conversations`: Sessões de conversa (um visitante -> um admin). Gerencia contadores de não lidos.
- `messages`: O conteúdo das mensagens, com flags `is_from_admin` e `read`.

---

## 3. Supabase Edge Functions

As Edge Functions (Deno/TypeScript) são o "cérebro" das integrações externas, rodando server-side.

### 3.1. `bet-webhook` (Prod v5)

Esta é a função mais importante para a operação de vendas e tracking. Ela recebe dados do frontend (via `script-na-bet.html`) e processa eventos.

- **Eventos Processados**:
  1.  **`signup`**:
      - Recebe dados de cadastro (email, telefone).
      - Salva/Atualiza na tabela `bet_leads` usando `email` como chave única.
      - Armazena todos os parâmetros UTM e dados de Pixel (fbc, fbp).
  2.  **`pix_generated`**:
      - Cria um registro na tabela `deposits` como `waiting_payment`.
      - Tenta vincular ao lead existente via Email ou Fingerprint (se o email falhar).
  3.  **`pix_paid`**:
      - Atualiza o registro em `deposits` para `paid`.
      - Atualiza o status do lead em `bet_leads` para `deposited`.
      - **Dispara conversão para a API da UTMify**: Envia o evento de compra aprovada (Depósito) para a plataforma de afiliação.

- **Regra de Negócio Crítica**: Se o parâmetro `utmify` não estiver presente no payload, a função ignora o evento logando "Ignored (No UTMify)". Isso evita sujar os dados com tráfego orgânico ou sem tracking.

### 3.2. `bet-hydrate` (Prod v1)

Função auxiliar para persistência de rastreamento entre sessões/dispositivos (Cross-Device Tracking).

- **Problema**: Um usuário clica no anúncio no celular (guarda UTMs), mas depois faz login no computador (sem UTMs).
- **Solução**:
  - O frontend envia um identificador (email, telefone ou parte do telefone) para esta função.
  - A função busca na tabela `bet_leads` se esse usuário já existe e tem histórico de `utmify`.
  - **Retorno**: Devolve ao frontend os dados originais de tracking (`utm_source`, `fbc`, `visitor_id`, etc.).
  - O frontend então "hidrata" o localStorage, permitindo que a conversão futura seja atribuída corretamente à campanha original.

### 3.3. Outras Funções (Deployed)

Existem outras funções listadas no projeto, possivelmente legadas ou auxiliares:

- `track-deposit`: Versão anterior ou alternativa de tracking.
- `bet-identify`, `bet-pix`, `bet-deposit`: Decomposição das funcionalidades que hoje parecem centralizadas no webhook.

---

## 4. Fluxo de Integração (Frontend <-> Backend)

1.  **Captura (Frontend)**: O usuário chega no site. O script (`script-na-bet.html`) salva UTMs no localStorage.
2.  **Ação (Cadastro)**: Usuário preenche email/telefone. O script envia POST para `bet-webhook` (evento: `signup`). Backend salva no `bet_leads`.
3.  **Ação (PIX)**: Usuário gera PIX. O script intercepta a resposta da rede e envia POST para `bet-webhook` (evento: `pix_generated`).
4.  **Recuperação (Hydration)**: Se o usuário voltar depois, ao digitar o email/telefone no login, o `bet-hydrate` restaura seus cookies de rastreamento.
5.  **Conversão (Backend)**: Quando o PIX é pago, o `bet-webhook` notifica a UTMify, garantindo a comissão do afiliado.

---

## 5. Segurança (RLS & Políticas)

- As tabelas `conversations` e `messages` possuem RLS (Row Level Security) habilitado, o que é boa prática.
- As Edge Functions operam com a `SUPABASE_SERVICE_ROLE_KEY` (privilégio total) para conseguir escrever dados de tracking e ler dados de leads sem restrições de usuário logado, já que muitas vezes o visitante é anônimo para o Supabase Auth.
