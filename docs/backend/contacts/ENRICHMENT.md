# Enriquecimento de Contatos

Processo automático para completar informações de contatos (LID vs Telefone).

## Conceito
O WhatsApp identifica usuários de duas formas:
1. **Telefone**: Formato padrão (ex: 5511999999999).
2. **LID (Identidade Digital)**: ID interno de privacidade.

O sistema tenta unir essas duas metades para evitar duplicidade.

## Fluxo
1. **Mensagem sem telefone (apenas LID)**:
   - Verifica histórico para achar telefone associado.
   - Se encontrar, atualiza nome e foto.
2. **Mensagem com telefone**:
   - Se já existe contato com esse número, anexa o LID.
   - Se existe contato duplicado (um só com LID, outro só com Telefone), o sistema realiza a **Fusão** (Merge) dos registros.

## Benefícios
- Evita contatos duplicados ("João" e "João LID").
- Garante funcionamento de botões e listas interativas (que exigem LID).
