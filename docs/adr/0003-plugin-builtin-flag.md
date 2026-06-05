# Plugin Activation via DB Flag (No Code Download)

Plugins built-in (Clientes, Helpdesk) são embarcados na imagem Docker; ativação é apenas flip de `PluginInstallations.active` no banco após validação de licença server-side pelo Watink Manager. Alternativa considerada: download dinâmico de código (rejeitada por risco de supply chain e complexidade de sandbox). Consequência: `active=true` sem licença válida é estado inválido — license check no Plugin Manager é autoritativo; novas versões de plugins requerem rebuild da imagem.

Status: accepted
