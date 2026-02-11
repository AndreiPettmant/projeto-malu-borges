# 🧪 Como Testar se pg_cron está Disponível

## 📝 Passo a Passo

### 1️⃣ **Acessar o Supabase SQL Editor**

1. Vá para: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **"SQL Editor"** no menu lateral

### 2️⃣ **Executar Script de Teste**

Copie e cole o conteúdo do arquivo `test_pg_cron.sql` no SQL Editor e clique em **"Run"**.

Ou execute esta query simples:

```sql
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') 
    THEN '✅ pg_cron DISPONÍVEL - você pode usar agendamento automático!'
    ELSE '❌ pg_cron NÃO DISPONÍVEL - use Edge Functions ou cron externo'
  END AS resultado;
```

---

## ✅ **Resultado: pg_cron DISPONÍVEL**

Se você vir: **"✅ pg_cron DISPONÍVEL"**

### O que fazer:

1. **Executar migration 012:**
   ```bash
   npm run db:migrate
   ```

2. **Verificar se o cron foi agendado:**
   ```sql
   SELECT * FROM cron.job;
   ```
   
   Você deve ver algo como:
   ```
   jobid | schedule    | command                          | active
   ------|-------------|----------------------------------|-------
   1     | 0 11 * * *  | SELECT generate_notifications(); | t
   ```

3. **Testar manualmente:**
   ```sql
   SELECT generate_notifications();
   SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 10;
   ```

4. **Pronto!** 🎉 
   - Notificações serão geradas automaticamente todo dia às 08:00 BRT
   - Você não precisa fazer mais nada

---

## ❌ **Resultado: pg_cron NÃO DISPONÍVEL**

Se você vir: **"❌ pg_cron NÃO DISPONÍVEL"**

### O que fazer:

#### **Opção A: Executar Manualmente (Temporário)**

Até implementar uma solução automatizada, você pode rodar manualmente todo dia:

```sql
SELECT generate_notifications();
```

#### **Opção B: Edge Function + GitHub Actions (Recomendado)**

**1. Criar Edge Function:**

```bash
# No terminal
mkdir -p supabase/functions/generate-notifications
```

**2. Criar arquivo:** `supabase/functions/generate-notifications/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

**3. Deploy da função:**

```bash
npx supabase login
npx supabase functions deploy generate-notifications --project-ref YOUR_PROJECT_REF
```

**4. Criar GitHub Action:** `.github/workflows/daily-notifications.yml`

```yaml
name: Generate Daily Notifications

on:
  schedule:
    - cron: '0 11 * * *'  # 11:00 UTC = 08:00 BRT
  workflow_dispatch:

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Notifications
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-notifications
```

**5. Configurar secrets no GitHub:**
   - Vá em: Settings → Secrets → Actions
   - Adicione: `SUPABASE_ANON_KEY`

#### **Opção C: Serviço Externo de Cron (Mais Fácil)**

1. **Criar Edge Function** (passos 1-3 acima)

2. **Cadastrar em serviço gratuito:**
   - https://cron-job.org (gratuito, sem cadastro de cartão)
   - https://www.easycron.com (100 jobs gratuitos/mês)

3. **Configurar:**
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/generate-notifications`
   - Header: `Authorization: Bearer YOUR_ANON_KEY`
   - Horário: Todo dia às 11:00 UTC (08:00 BRT)

---

## 📊 **Como Verificar se Está Funcionando**

### Ver notificações criadas hoje:

```sql
SELECT * 
FROM user_notifications 
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

### Ver próximos entregáveis que vão disparar notificação:

```sql
SELECT 
  j.title AS job,
  d.title AS deliverable,
  d.due_date,
  (d.due_date - CURRENT_DATE) AS days_left
FROM deliverables d
JOIN jobs j ON j.id = d.job_id
WHERE d.status IN ('pendente', 'em_producao')
  AND d.due_date >= CURRENT_DATE
  AND (d.due_date - CURRENT_DATE) IN (15, 7, 3, 1)
ORDER BY d.due_date;
```

### Ver histórico de execuções do cron (se pg_cron disponível):

```sql
SELECT * 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🆘 **Problemas Comuns**

### "permission denied for schema cron"
- **Causa:** Você não tem permissão para usar pg_cron
- **Solução:** Confirme que pg_cron não está disponível e use Edge Functions

### "function generate_notifications() does not exist"
- **Causa:** Migration 012 não foi executada
- **Solução:** Execute `npm run db:migrate`

### "Notificações não estão aparecendo no dashboard"
- **Causa:** A função não está sendo executada automaticamente
- **Solução:** Execute manualmente `SELECT generate_notifications();` ou configure Edge Function

---

## 📚 **Referências**

- Documentação completa: `NOTIFICACOES.md`
- Supabase Cron: https://supabase.com/docs/guides/database/extensions/pg_cron
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- GitHub Actions Cron: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
