# Go Migration from Node Legacy

Backend e Engine migrados de Node.js/Express/Sequelize e Node/whaileys para Go/Gin/GORM e Go/whatsmeow. Decisão motivada por performance (concorrência nativa), tipagem estática, e binário único sem runtime. Alternativa considerada: manter Node com TypeScript strict (rejeitada por custo de refatoração equivalente sem ganho de performance). Consequência: legado em `legacy/` como referência; APIs mantêm compatibilidade de contratos; frontend não requer mudanças; remoção do legado é gradual.

Status: accepted
