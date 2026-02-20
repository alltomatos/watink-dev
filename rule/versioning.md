# Regra de Atualização de Versão e Changelog

Esta regra define o procedimento padrão para realizar releases no WatinkDev. O objetivo é garantir que o `package.json`, `version.json` e `CHANGELOG.md` estejam sempre sincronizados e que o binário Go embuta o build mais recente.

## 🛠️ Ferramenta de Automação
Utilize o script centralizado para realizar a atualização completa:

```bash
node scripts/release.js <tipo> "<mensagem>"
```

### Parâmetros:
1. **Tipo:** `patch` (correções), `minor` (novas funcionalidades), `major` (mudanças estruturais).
2. **Mensagem:** Descrição curta da principal mudança para o changelog.

---

## 📜 Fluxo da Regra (Manual ou Automático)

### 1. Versionamento Semântico
- **PATCH (0.0.x):** Pequenas correções de bugs.
- **MINOR (0.x.0):** Novas features ou melhorias significativas.
- **MAJOR (x.0.0):** Mudanças que quebram compatibilidade ou grandes pivots.

### 2. Arquivos de Veracidade
- **package.json:** Fonte primária da versão.
- **CHANGELOG.md:** Registro histórico legível por humanos. Deve seguir o padrão [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
- **version.json:** Exposto via HTTP para o monitor e dashboard. Atualizado automaticamente durante o `npm run build`.

### 3. Integração Go (Embed)
Sempre que o frontend for atualizado, o backend Go **DEVE** ser recompilado para que o novo build seja embutido no executável:
```bash
cd watinkdev/bussines && go build -o backend-go cmd/server/main.go
```

### 4. Notificação de Agentes
Toda release deve ser notificada ao **Robot** via Brain Sync no Supabase para manter a consciência unificada do projeto.

---

**Status da Regra:** Ativa ✅
**Data:** 20 de Fevereiro de 2026
**Responsável:** Groud 🦞
