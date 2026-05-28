# Release de Binários (watink-business)

Este projeto (`watinkdev`) publica binários no repositório de distribuição:

- **Destino:** `alltomatos/watink-business`
- **Código fonte:** permanece no `watinkdev`

## Secrets necessários (no repositório `watinkdev`)

Em **Settings > Secrets and variables > Actions**:

- `WATINK_BUSINESS_PAT`
  - Token com permissão de escrita no repo `alltomatos/watink-business`
  - Escopo recomendado: `repo` (classic) ou fine-grained com `Contents: Read/Write`

## Workflows

### 1) Release Business Binaries
Arquivo: `.github/workflows/release-business-binaries.yml`

Gera e publica:
- `watink-core-linux-amd64-vX.Y.Z.tar.gz`
- `watink-core-windows-amd64-vX.Y.Z.zip`
- `SHA256SUMS.txt`
- `manifest.json`

Inputs:
- `version` (ex: `0.7.121`)
- `prerelease` (`true/false`)
- `changelog` (opcional)
- `environment_name` (ex: `production`, para ler o secret `WATINK_BUSINESS_PAT`)
- `breaking_release` (`true/false`) — marca release com quebra
- `min_compatible_from` (ex: `0.7.120`) — bloqueio de upgrade direto em versões antigas
- `migration_notes` (opcional) — instrução de migração obrigatória

### 2) Promote Business Release
Arquivo: `.github/workflows/promote-business-release.yml`

Promove (copia assets) de uma tag para outra no repo de binários.

Inputs:
- `source_tag` (ex: `v0.7.121`)
- `target_tag` (ex: `v0.7.121-stable`)
- `prerelease` (`true/false`)
- `notes` (opcional)
- `environment_name` (ex: `production`, para ler o secret `WATINK_BUSINESS_PAT`)

## Fluxo recomendado

1. Rodar `Release Business Binaries` com versão nova.
2. Validar em ambiente de homologação.
3. Rodar `Promote Business Release` para tag estável.
