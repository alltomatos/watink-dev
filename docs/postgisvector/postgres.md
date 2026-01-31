# Guia de Configuração e Variáveis de Ambiente

Este documento detalha as variáveis de ambiente suportadas pela imagem Docker `watink/postgres-postgis-pgvector` e como configurá-las corretamente para integração com sua aplicação.

## Variáveis de Ambiente do PostgreSQL

Estas são as variáveis que o **container do banco de dados espera receber**. Você deve definir estas variáveis para controlar o comportamento do banco.

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `postgres` | O superusuário do banco de dados que será criado na inicialização. |
| `POSTGRES_PASSWORD` | `postgres` | A senha para o superusuário. **Obrigatório** mudar para produção. |
| `POSTGRES_DB` | `mydb` | Nome do banco de dados padrão criado na inicialização. |
| `POSTGRES_INITDB_ARGS` | *(vazio)* | Argumentos extras para o comando `initdb`. |
| `POSTGRES_HOST_AUTH_METHOD` | `trust` | (Opcional) Define método de autenticação. `trust` permite acesso sem senha localmente (cuidado em produção). |

---

## 🔄 Como Mapear Variáveis da Sua Aplicação (Ex: Watink)

Muitas aplicações usam seus próprios nomes de variáveis (ex: `DB_USER`, `DB_PASS`). O container do PostgreSQL **NÃO** reconhece essas variáveis automaticamente.

Para conectar sua aplicação ao banco usando as variáveis dela, você deve fazer o **mapeamento** no seu arquivo `docker-compose.yml`.

### Exemplo Prático: Mapeando Variáveis "Watink"

Suponha que sua aplicação use estas variáveis:
- `DB_USER`
- `DB_PASS`
- `DB_NAME`

Seu `docker-compose.yml` deve ficar assim:

```yaml
version: '3.8'

services:
  # Serviço do Banco de Dados
  postgres:
    image: watink/postgres-postgis-pgvector:16-optimized
    environment:
      # LADO ESQUERDO: O que o Banco espera (NÃO MUDE)
      # LADO DIREITO: A variável da sua aplicação
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASS:-senha123}
      POSTGRES_DB: ${DB_NAME:-watink}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Serviço da Sua Aplicação
  backend:
    image: sua-aplicacao:latest
    environment:
      # A aplicação recebe as variáveis dela normalmente
      DB_HOST: postgres
      DB_USER: ${DB_USER:-postgres}
      DB_PASS: ${DB_PASS:-senha123}
      DB_NAME: ${DB_NAME:-watink}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### O que acontece aqui?

1.  O Docker Docker lê a variável `DB_USER` do seu ambiente (ou arquivo `.env`).
2.  Ele injeta esse valor na variável `POSTGRES_USER` do container do banco.
3.  O PostgreSQL inicia e cria o usuário com esse nome.

---

## ⚠️ Importante: Persistência de Dados e Senhas

### 1. Primeira Execução vs. Containers Existentes
As variáveis `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` funcionam **APENAS na primeira vez** que o container é criado e o volume de dados está vazio.

- **Se você já rodou o container antes:** O banco de dados já foi inicializado e salvo no volume.
- **Se você mudar o `POSTGRES_PASSWORD` no docker-compose depois:** O container vai ignorar a mudança, pois ele preserva os dados (e a senha) que já existem no disco.

### 2. Como mudar a senha de um banco já existente?
Se você precisar alterar a senha de um container que já existe sem perder os dados, você deve usar SQL:

1.  Entre no container:
    ```bash
    docker exec -it <nome-do-container> psql -U <usuario-atual> -d <nome-do-banco>
    ```
2.  Execute o comando SQL:
    ```sql
    ALTER USER seu_usuario WITH PASSWORD 'nova_senha';
    ```

### 3. Como resetar tudo (Perde todos os dados)?
Se você estiver em desenvolvimento e quiser "zerar" tudo para que as variáveis do docker-compose voltem a funcionar:

```bash
docker-compose down -v
docker-compose up -d
```
*(O comando `down -v` apaga os volumes e todos os dados salvos).*
