# DB-003: Estratégia de Backup e Recuperação (PITR)

## Visão Geral

Para garantir a continuidade do negócio e a integridade dos dados na arquitetura SaaS do Whaticket Community, é essencial implementar uma estratégia robusta de backup e recuperação.

Este documento define a estratégia de backup para o banco de dados PostgreSQL, cobrindo backups lógicos (diários) e físicos/PITR (Point-in-Time Recovery) para recuperação de desastres.

## Estratégia Definida

### 1. Backups Lógicos (Dump)

**Objetivo:** Facilidade de migração, análise de dados e restauração parcial.
**Ferramenta:** `pg_dump`
**Frequência:** Diária (ex: 02:00 AM)
**Retenção:** 30 dias

**Procedimento:**
O script de backup deve:
1. Conectar ao container do PostgreSQL.
2. Executar `pg_dump` com formato custom (`-Fc`) para permitir restauração paralela e seletiva.
3. Comprimir e salvar o arquivo com timestamp.
4. (Em produção) Upload para Object Storage (AWS S3, MinIO, Google Cloud Storage).

### 2. Backups Físicos e PITR (Point-in-Time Recovery)

**Objetivo:** Recuperação de desastres com RPO (Recovery Point Objective) próximo de zero. Permite restaurar o banco para um segundo específico no passado.
**Ferramenta:** WAL Archiving (Write-Ahead Logging)
**Estratégia:**
- **Base Backup:** Backup físico completo semanal.
- **WAL Archiving:** Envio contínuo dos logs de transação (WALs) para armazenamento externo.

**Configuração Necessária (postgresql.conf):**

Para habilitar o PITR, o PostgreSQL deve estar configurado com:

```ini
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/data/archive/%f' # Exemplo local, usar ferramenta como Wal-G para S3
archive_timeout = 60
```

> **Nota:** Em ambiente de desenvolvimento/Docker local, o PITR geralmente não é ativado por padrão para economizar espaço em disco, mas a infraestrutura de produção deve ter isso mandatório.

## Scripts de Automação

Scripts utilitários foram criados em `scripts/database/` para facilitar operações manuais e agendadas (cron).

### Backup Manual (`scripts/database/backup.sh`)
Executa um dump completo do banco de dados atual.

```bash
./scripts/database/backup.sh
```

### Restore Manual (`scripts/database/restore.sh`)
Restaura um dump específico. **Atenção: Isso sobrescreve os dados atuais.**

```bash
./scripts/database/restore.sh <caminho_do_arquivo_dump>
```

## Plano de Recuperação de Desastres (DRP)

1. **Cenário: Perda de Dados Acidental (Ex: DELETE sem WHERE)**
   - Identificar o horário exato do erro.
   - Provisionar nova instância de banco.
   - Restaurar o Base Backup mais recente anterior ao erro.
   - Replay dos arquivos WAL até o timestamp desejado (PITR).
   - Alterar DNS/Connection String para a nova instância.

2. **Cenário: Corrupção de Banco de Dados**
   - Restaurar o último Backup Lógico (Dump) validado.
   - Aceitar a perda de dados entre o backup e o incidente (RPO de até 24h neste caso, se o PITR falhar).

## Próximos Passos
- Configurar rotina de backup automático no servidor de produção (Cronjob).
- Validar restore periodicamente (mensalmente).
