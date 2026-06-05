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

## Deploy

O front é um SPA estático (`dist`) — publique em qualquer host estático gratuito
(Cloudflare Pages, Vercel ou Netlify):

```bash
npm run build   # gera dist/
```

Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel do host e
adicione a URL de produção em **Authentication → URL Configuration** no Supabase (Site URL e
Redirect URLs) para o login com Google funcionar.

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
