# Engine Standard (Whaileys)

## Visão Geral
Este microsserviço é o núcleo responsável pela comunicação direta com os servidores do WhatsApp. Ele gerencia as sessões (socket), criptografia e eventos em tempo real.

O projeto utiliza a biblioteca **`whaileys`**, um fork personalizado da popular biblioteca `Baileys`.

## Por que um Fork? (`alltomatos/whaileys`)
Este projeto utiliza o fork mantido pela **AllTomatos** (https://github.com/alltomatos/whaileys), que por sua vez é um fork do projeto **Canove** (`canove/whaileys`), baseado na biblioteca original `Baileys`.

Nossa versão inclui modificações críticas e funcionalidades que não estão presentes no projeto original do Canove, destacando-se:
- **Implementação do `usync`**: Sincronização avançada de contatos e status.
- Correções de estabilidade específicas para o nosso fluxo.

## Funcionalidades
- **Multisessão**: Gerencia múltiplas conexões simultâneas.
- **API via Filas**: Totalmente desacoplado via RabbitMQ.
- **Suporte a Mídia**: Envio e recebimento de imagens, áudio, vídeo e documentos.
- **Pareamento via Código**: Suporte a Pairing Code além do QR Code.

## Estrutura
- `.sessions_auth/`: Armazena as credenciais de autenticação (sessões).
- `src/`: Código fonte TypeScript.
