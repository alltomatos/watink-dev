# Watink Industrial Release & Distribution 🦞

Esta documentação detalha o novo processo de distribuição do Watink como um binário unificado (Backend + Frontend Embed).

## 🚀 O Conceito de Binário Único
Diferente das versões anteriores que exigiam gerenciar múltiplas pastas e processos Node.js, a versão industrial do Watink compila todo o código (API Go + Interface React) em um único arquivo executável.

### Vantagens:
- **Instalação em 1 Segundo:** Basta rodar o arquivo.
- **Segurança:** O código do frontend fica inacessível no navegador para modificações não autorizadas.
- **Escala:** Consumo de memória reduzido em até 80%.
- **Atomicidade:** Backend e Frontend viajam juntos; nunca haverá erro de versão entre eles.

---

## 🛠️ Como Gerar um Release

Para gerar os instaladores para Windows e Linux, execute o script de release na raiz do projeto:

```bash
./release.sh
```

Este script irá:
1. Instalar dependências e buildar o Frontend React.
2. Copiar os arquivos estáticos para dentro da pasta de compilação do Go.
3. Cross-compilar o código Go para Linux (64 bits) e Windows (.exe).
4. Gerar os artefatos na pasta `/release`.

---

## 💻 Como Executar

### Linux
1. Dê permissão de execução: `chmod +x watink-linux`
2. Configure as variáveis de ambiente (DB_HOST, DB_PASS, etc) via export ou arquivo `.env`.
3. Rode: `./watink-linux`

### Windows
1. Configure as variáveis de ambiente no sistema ou via arquivo `.env` na mesma pasta.
2. Execute o `watink.exe`.

---

## 🐳 Distribuição via Docker (Industrial & Portainer)

Para usuários que desejam a máxima estabilidade em servidores Linux ou via Portainer:

### 1. Imagem Unificada
A imagem `watink/industrial:latest` contém tudo (Front + Back) em um único processo.

### 2. Deploy em 1 Clique (Portainer / Docker Compose)
Basta utilizar o arquivo `docker-compose.industrial.yml` fornecido. Ele sobe automaticamente:
- **Postgres:** Banco de dados otimizado.
- **Redis:** Cache de alta performance.
- **RabbitMQ:** Mensageria assíncrona.
- **Watink Industrial:** O núcleo do sistema.

**Vantagem:** O binário em Go possui inteligência para aguardar a inicialização do banco e do RabbitMQ. Se o Postgres demorar 30 segundos para subir, o Watink ficará em "wait mode" e só liberará o acesso quando a infra estiver 100% pronta.

---

## 🌍 Estratégia de Distribuição
- **Watink Business:** O binário gerado aqui contém as funções essenciais de multi-atendimento.
- **Marketplace:** Plugins de terceiros ou recursos Premium podem ser carregados dinamicamente ou via microserviços externos (ex: Engine Go WhatsMeow), mantendo o núcleo estável e leve.

---
*Watink: Elevando o atendimento ao nível industrial.*
