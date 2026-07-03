# Plugin Activation via DB Flag (No Code Download)

Plugins built-in (Clientes, Helpdesk) são embarcados na imagem Docker; ativação é apenas flip de `PluginInstallations.active` no banco após validação de licença server-side pelo Watink Manager. Alternativa considerada: download dinâmico de código (rejeitada por risco de supply chain e complexidade de sandbox). Consequência: `active=true` sem licença válida é estado inválido — license check no Plugin Manager é autoritativo; novas versões de plugins requerem rebuild da imagem.

Status: accepted (parcialmente superado pelo ADR 0024)

> **Superado em parte pelo [ADR 0024](0024-plugin-marketplace-licensing-redesign.md)** (jul/2026): o ponto anti-download-de-código permanece válido — plugins seguem embarcados na imagem. MAS `PluginInstallations.active` **deixou de ser autoridade**: passou a ser apenas o registro de **alocação** de um plugin a um tenant; a autoridade de licença é o **token assinado (Ed25519)** emitido pelo **Watink Hub** e verificado offline pelo `plugin-manager` local. O "Watink Manager" citado abaixo é o atual **Watink Hub** (`watink-ecosistema/hub`).
