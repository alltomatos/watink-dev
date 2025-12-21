# DB-004: Preparação para Escalabilidade Horizontal (Read Replicas)

## Visão Geral

À medida que o volume de dados e o número de usuários simultâneos aumentam em uma arquitetura SaaS, o banco de dados frequentemente se torna o gargalo. A estratégia de **Read Replicas** (Réplicas de Leitura) permite distribuir a carga de consultas (SELECTs) entre várias instâncias do banco de dados, mantendo apenas as operações de escrita (INSERT, UPDATE, DELETE) na instância primária (Writer).

## Estratégia Implementada

O Sequelize suporta nativamente a configuração de replicação. Implementamos a seguinte lógica na configuração do banco de dados:

1.  **Write Instance (Primária):**
    - Definida pelas variáveis de ambiente padrão (`DB_HOST`, `DB_USER`, `DB_PASS`, etc.).
    - Responsável por todas as operações de escrita e, por padrão, leituras críticas.

2.  **Read Instances (Réplicas):**
    - Definida pela nova variável de ambiente `DB_READ_HOST`.
    - Se `DB_READ_HOST` estiver definida, o Sequelize distribuirá automaticamente as consultas de leitura (SELECT) para este host.
    - Se `DB_READ_HOST` não estiver definida, o sistema utiliza o `DB_HOST` (comportamento padrão/monolítico).

## Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
| :--- | :--- | :--- |
| `DB_HOST` | Host da instância de escrita (Master) | `localhost` |
| `DB_READ_HOST` | Host da instância de leitura (Replica) | Mesmo que `DB_HOST` |

### Exemplo de Uso (Produção)

```env
DB_HOST=postgres-primary.cluster.internal
DB_READ_HOST=postgres-replica-01.cluster.internal
```

## Benefícios

- **Performance:** Consultas pesadas de relatórios e dashboards não impactam a performance de envio/recebimento de mensagens (escrita).
- **Alta Disponibilidade:** Em caso de falha do Master, uma réplica pode ser promovida (dependendo da orquestração de infraestrutura).
- **Escalabilidade:** É possível adicionar mais réplicas de leitura conforme a demanda cresce, sem alterar a aplicação.

## Considerações Importantes

- **Lag de Replicação:** Existe um pequeno atraso (geralmente milissegundos) entre a escrita no Master e a disponibilidade na Réplica.
- **Leitura Forte:** Para casos onde a leitura deve ser imediata após a escrita (ex: criar usuário e logar imediatamente), o Sequelize permite forçar a leitura no Master usando a opção `useMaster: true` ou garantindo a transação.

## Próximos Passos (Infraestrutura)

Esta tarefa preparou o **código** da aplicação. Para efetivar o uso, a equipe de DevOps deve:
1. Provisionar instância(s) de réplica no provedor de nuvem (AWS RDS, Google Cloud SQL, etc.).
2. Configurar a replicação física (streaming replication) entre o Master e as Réplicas.
3. Definir a variável `DB_READ_HOST` no ambiente de produção.
