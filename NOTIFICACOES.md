# 🔔 Sistema de Notificações - Documentação Técnica

## 📋 Como Funciona

### Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENDAMENTO (pg_cron)                     │
│                  Todo dia às 08:00 BRT                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            FUNÇÃO: generate_notifications()                  │
│                                                              │
│  1. Verifica prazos de:                                     │
│     • Jobs (end_date)                                       │
│     • Entregáveis (due_date)                               │
│     • Checklist Items (due_date)                           │
│                                                              │
│  2. Filtra por dias até vencer:                            │
│     • 15 dias antes (entregáveis)                          │
│     • 7 dias antes                                          │
│     • 3 dias antes                                          │
│     • 1 dia antes (amanhã)                                  │
│     • Hoje (vence HOJE)                                     │
│                                                              │
│  3. Evita duplicatas:                                       │
│     • Não notifica mais de 1x por dia sobre o mesmo item   │
│                                                              │
│  4. Insere na tabela:                                       │
│     • user_notifications                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              TABELA: user_notifications                      │
│                                                              │
│  Colunas principais:                                        │
│  • user_id: quem será notificado                           │
│  • title: título curto da notificação                      │
│  • message: mensagem detalhada                             │
│  • type: tipo (deliverable_due, job_deadline, etc)         │
│  • entity_type: job | deliverable | checklist_item         │
│  • entity_id: UUID do item relacionado                     │
│  • is_read: se o usuário já leu                            │
│  • created_at: timestamp                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                DASHBOARD (Frontend)                          │
│                                                              │
│  • Busca notificações não lidas (is_read = false)          │
│  • Exibe no topo do dashboard                              │
│  • Permite marcar como lida                                │
│  • Link direto para o job/entregável                       │
└─────────────────────────────────────────────────────────────┘
```

---

## ⏰ Intervalos de Notificação

### Por Tipo de Entidade

| Entidade | 15 dias | 7 dias | 3 dias | 1 dia | Hoje |
|----------|---------|--------|--------|-------|------|
| **Entregáveis** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Jobs** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Checklist Items** | ❌ | ❌ | ✅ | ✅ | ❌ |

### Mensagens de Exemplo

#### Entregável - 15 dias
```
Título: Entregável vence em 15 dias
Mensagem: O entregável "Reel de Verão" do job "Campanha Glow Drops" vence em 26/02/2026.
```

#### Entregável - Hoje
```
Título: 🔴 Entregável vence HOJE!
Mensagem: O entregável "Reel de Verão" do job "Campanha Glow Drops" vence hoje. Priorize!
```

#### Job - 3 dias
```
Título: Job finaliza em 3 dias
Mensagem: O job "Campanha Glow Drops" está próximo do prazo final (28/02/2026).
```

#### Checklist Item - 1 dia
```
Título: Tarefa vence amanhã
Mensagem: A tarefa "Gravar chegada" do entregável "Stories Resort" (job "Verão Tropical") vence em 26/02/2026.
```

---

## 🔧 Implementação

### Opção 1: pg_cron (Supabase Database Extension)

**Vantagens:**
- Roda direto no banco de dados
- Não precisa de infraestrutura externa
- Configuração simples

**Desvantagens:**
- Pode não estar disponível no plano gratuito do Supabase
- Menos flexível que Edge Functions

**Como ativar:**
```sql
-- Na migration 012_schedule_notifications.sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-daily-notifications',
  '0 11 * * *',  -- 11:00 UTC = 08:00 BRT
  'SELECT generate_notifications();'
);
```

**Verificar se está funcionando:**
```sql
-- Listar cron jobs
SELECT * FROM cron.job;

-- Ver histórico de execuções
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

### Opção 2: Supabase Edge Functions (Deno) + GitHub Actions

Se `pg_cron` não estiver disponível, use Edge Functions com trigger externo.

**1. Criar Edge Function**

```typescript
// supabase/functions/generate-notifications/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Executar função do banco
    const { error } = await supabase.rpc('generate_notifications')
    
    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, message: 'Notificações geradas' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**2. Deploy da Edge Function**
```bash
supabase functions deploy generate-notifications
```

**3. GitHub Actions para agendar**

```yaml
# .github/workflows/daily-notifications.yml
name: Generate Daily Notifications

on:
  schedule:
    - cron: '0 11 * * *'  # 11:00 UTC = 08:00 BRT
  workflow_dispatch:  # Permite execução manual

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://YOUR_PROJECT.supabase.co/functions/v1/generate-notifications
```

---

### Opção 3: Serviço Externo (cron-job.org, EasyCron)

**Configuração:**
1. Criar Edge Function (como na Opção 2)
2. Cadastrar no serviço de cron gratuito
3. Agendar requisição HTTP diária

---

## 🧪 Testar Manualmente

### 1. Executar a função diretamente

```sql
-- No Supabase SQL Editor
SELECT generate_notifications();
```

### 2. Verificar notificações criadas

```sql
SELECT * 
FROM user_notifications 
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

### 3. Simular cenário de teste

```sql
-- Criar um entregável que vence amanhã
UPDATE deliverables 
SET due_date = CURRENT_DATE + INTERVAL '1 day'
WHERE id = 'algum-uuid';

-- Executar função
SELECT generate_notifications();

-- Ver se criou notificação
SELECT * FROM user_notifications WHERE entity_id = 'algum-uuid';
```

---

## 📊 Monitoramento

### Queries úteis

```sql
-- Notificações criadas hoje
SELECT COUNT(*), type 
FROM user_notifications 
WHERE created_at::date = CURRENT_DATE
GROUP BY type;

-- Notificações não lidas por usuário
SELECT u.email, COUNT(*) as unread
FROM user_notifications n
JOIN auth.users u ON u.id = n.user_id
WHERE n.is_read = FALSE
GROUP BY u.email;

-- Entregáveis que vão vencer nos próximos 15 dias
SELECT j.title AS job, d.title AS deliverable, d.due_date,
       (d.due_date - CURRENT_DATE) AS days_left
FROM deliverables d
JOIN jobs j ON j.id = d.job_id
WHERE d.status IN ('pendente', 'em_producao')
  AND d.due_date >= CURRENT_DATE
  AND d.due_date <= CURRENT_DATE + INTERVAL '15 days'
ORDER BY d.due_date;
```

---

## 🚀 Próximos Passos

1. **Executar migration 012**:
   ```bash
   npm run db:migrate
   ```

2. **Verificar se pg_cron está disponível**:
   ```sql
   SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';
   ```

3. **Se pg_cron NÃO estiver disponível**:
   - Implementar Opção 2 (Edge Functions + GitHub Actions)
   - Ou usar Opção 3 (serviço externo)

4. **Testar manualmente** antes de confiar no cron

5. **Monitorar logs** nas primeiras semanas

---

## 🎯 Resumo

**ANTES (Estado Atual):**
- ❌ Notificações só existem se inseridas manualmente
- ❌ Nenhum processo automático rodando
- ❌ Usuários não recebem avisos de prazos

**DEPOIS (Com Migration 012):**
- ✅ Notificações geradas automaticamente todo dia às 08:00
- ✅ Avisos em 15, 7, 3, 1 dia antes e no dia do vencimento
- ✅ Cobertura para jobs, entregáveis e checklist items
- ✅ Evita duplicatas
- ✅ Usuários veem avisos no dashboard
