# Controle Financeiro

Aplicação web de controle financeiro pessoal: cadastre contas, categorias e transações, defina
orçamentos mensais por categoria e acompanhe receitas, despesas e saldos em um dashboard com
gráficos. Os dados são sincronizados em tempo real por usuário no Supabase.

## Funcionalidades

- **Autenticação** por e-mail/senha e Google (Supabase Auth)
- **Contas** (corrente, poupança, crédito, investimento) com saldo calculado a partir das transações
- **Categorias** de receita e despesa (com um conjunto padrão criado no primeiro acesso)
- **Transações** com busca e filtros por tipo, categoria e conta
- **Orçamentos** mensais por categoria, com acompanhamento de consumo
- **Relatórios** por período e exportação em **CSV** e **PDF**
- **Tema** claro/escuro
- **PWA** instalável (Android, iOS e desktop) com cache offline
- Sincronização em tempo real (Supabase Realtime / `postgres_changes`)

## Stack

React 19 · TypeScript · Vite · Zustand · React Router · Supabase (Auth + Postgres + Realtime) ·
Recharts · date-fns · jsPDF

## Pré-requisitos

- **Node.js 20.19+ ou 22.12+** (veja `.nvmrc` — `nvm use`)
- Um projeto no [Supabase](https://supabase.com) com **Authentication** e o schema aplicado
  (tabelas `accounts`, `categories`, `transactions`, `budgets` com RLS)

## Configuração

```bash
npm install
cp .env.example .env   # preencha com a URL e a chave publishable do seu projeto Supabase
```

Variáveis necessárias no `.env` (prefixo `VITE_` é obrigatório para o Vite expor ao cliente):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

> A chave publishable (`sb_publishable_...`) é pública por design — o que protege os dados são
> as políticas de **Row Level Security** (RLS), que restringem cada linha ao seu dono
> (`auth.uid() = user_id`).

No painel do Supabase, em **Authentication → Providers**, habilite **Email** e **Google**.
Para o Google, adicione a URL de callback `https://<project>.supabase.co/auth/v1/callback`
ao cliente OAuth no Google Cloud Console (dá para reaproveitar um cliente existente).

## Scripts

| Comando             | Descrição                              |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento (HMR)      |
| `npm run build`     | Type-check + build de produção (`dist`)|
| `npm run typecheck` | Apenas verificação de tipos            |
| `npm run lint`      | ESLint                                 |
| `npm run preview`   | Pré-visualiza o build de produção      |

## Valores monetários (centavos)

Todos os valores em dinheiro (`amount`, `balance`, `limitAmount`) são armazenados como
**centavos inteiros** (ex.: R$ 10,50 → `1050`), tanto no app quanto nas colunas `bigint` do
Postgres. Isso evita imprecisão de ponto flutuante. A conversão para/de reais acontece só nas
bordas (formulários e exibição) — veja [`src/utils/money.ts`](src/utils/money.ts).
`formatCurrency()` recebe centavos.

## Banco de dados (Supabase)

O schema vive no projeto Supabase: tabelas `accounts`, `categories`, `transactions` e `budgets`,
todas com RLS por dono e adicionadas à publication `supabase_realtime`. As 11 categorias padrão
são criadas automaticamente no signup por uma trigger (`handle_new_user` em `auth.users`).

## Deploy (Vercel)

O front é um SPA estático (`dist`) hospedado na **Vercel**, em produção:

- 🌐 **Produção:** https://controle-financeiro-one-wine.vercel.app
- O projeto está **conectado ao GitHub**: cada `git push` na `main` dispara um deploy
  automático (e cada PR gera um *preview*).

### Configuração na Vercel

A Vercel detecta o **Vite** sozinha (Build: `vite build`, Output: `dist`). O roteamento
client-side (React Router) é resolvido pelo [`vercel.json`](vercel.json), que reescreve todas
as rotas para `index.html` — sem ele, links diretos como `/transacoes` dariam 404.

**Environment Variables** (em _Project → Settings → Environment Variables_, escopo Production):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
```

> São lidas em **build time** pelo Vite. Se faltarem, o app exibe "Configuração do Supabase
> ausente" (ver [`src/main.tsx`](src/main.tsx)).

### Supabase (uma vez, por URL de produção)

Em **Authentication → URL Configuration** no Supabase:

- **Site URL:** a URL de produção da Vercel
- **Redirect URLs:** a mesma URL com `/**` (e, opcionalmente, `https://*.vercel.app/**` para
  os previews) — necessário para o login com **Google**.

### Deploy manual (alternativa ao push)

Com a [CLI da Vercel](https://vercel.com/docs/cli) autenticada (`VERCEL_TOKEN` ou `vercel login`):

```bash
npm run build                  # opcional, só para conferir o build local
vercel deploy --prod --yes     # publica em produção
```

## PWA (instalar no celular)

O app é um **PWA** (`vite-plugin-pwa`): pode ser instalado na tela inicial e funciona offline.

- **Android (Chrome):** aparece um botão **Instalar app** em _Configurações_ (e o banner nativo do Chrome).
- **iPhone/iPad (Safari):** **Compartilhar → Adicionar à Tela de Início** (o iOS não permite botão automático).
- **Desktop:** ícone de instalar na barra de endereço do navegador.

Os ícones (`public/pwa-192.png`, `pwa-512.png`, `apple-touch-icon.png`) são gerados a partir de
[`scripts/icon-source.svg`](scripts/icon-source.svg) com `npm run icons`. O service worker atualiza
sozinho (`registerType: 'autoUpdate'`) a cada novo deploy.

## Estrutura

```
src/
  components/   # UI reutilizável (ui/) e layout (layout/) e gráficos (charts/)
  hooks/        # useDataSync — assinaturas em tempo real (Supabase Realtime)
  pages/        # uma pasta por rota (Dashboard, Transações, Contas, ...)
  services/     # acesso ao Supabase (client + auth + uma camada por tabela)
  stores/       # estado global com Zustand (auth, dados, tema)
  types/        # tipos do domínio
  utils/        # formatação, estatísticas e exportação CSV/PDF
```
