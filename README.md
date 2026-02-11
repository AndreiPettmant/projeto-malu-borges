# Malu Borges - Gestão de Campanhas

Aplicativo interno para organizar, executar e acompanhar campanhas de influenciador.

## Stack Tecnológica

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend (serverless)**: Netlify Functions (TypeScript)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Deploy**: Netlify

## Estrutura do Projeto

```
projeto-malu-borges/
├── frontend/              # App React + TypeScript
│   ├── src/
│   │   ├── components/    # Componentes (Layout, ProtectedRoute)
│   │   ├── contexts/      # Contextos React (AuthContext)
│   │   ├── lib/           # Configurações (Supabase client)
│   │   ├── pages/         # Páginas da aplicação
│   │   └── types/         # Tipos TypeScript
│   └── ...
├── netlify/
│   └── functions/         # Netlify Functions (API serverless)
│       ├── organizar-briefing.ts
│       └── pendencias.ts
├── supabase/
│   └── migrations/        # SQL migrations para o Supabase
├── netlify.toml           # Configuração do Netlify (build, redirects, functions)
└── ROADMAP_MALU_BORGES.md # Roadmap completo do projeto
```

## Configuração

### 1. Instalar dependências

```bash
npm run install:all
```

### 2. Configurar variáveis de ambiente

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

**Raiz** (`.env` - para Netlify Functions):
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key
```

### 3. Configurar o banco de dados (Supabase)

Execute as migrations na ordem dentro do **SQL Editor** do Supabase:

1. `supabase/migrations/001_initial_schema.sql` - Cria todas as tabelas
2. `supabase/migrations/002_seed_roles.sql` - Insere papéis e permissões iniciais
3. `supabase/migrations/003_rls_policies.sql` - Configura políticas de segurança (RLS)

### 4. Rodar o projeto localmente

```bash
npm run dev
```

Isso roda **tudo junto** (frontend + Netlify Functions) via `netlify dev` em http://localhost:8888.

## Deploy no Netlify

1. Conecte o repositório no Netlify
2. Configure as variáveis de ambiente no painel do Netlify:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. O Netlify detecta automaticamente o `netlify.toml` e faz o build

## Funcionalidades

- Login com e-mail/senha (Supabase Auth)
- Página institucional (Hero) com carrossel de vídeos
- Dashboard de projetos/jobs
- CRUD de Jobs com escopo, vigência, briefing e brainstorm
- Entregáveis por job com status (pendente/em produção/entregue)
- Datas importantes por job
- Acompanhamento visual de entregas
- Painel de configuração da Home
- Gráficos e indicadores
- IA para organizar briefing e apontar pendências
- Gestão de papéis e permissões (RBAC)
- Painel de auditoria
