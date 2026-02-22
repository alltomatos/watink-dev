# Release de Binários (watink-bussines)

Este projeto (`watinkdev`) publica binários no repositório de distribuição:

- **Destino:** `alltomatos/watink-bussines`
- **Código fonte:** permanece no `watinkdev`

## Secrets necessários (no repositório `watinkdev`)

Em **Settings > Secrets and variables > Actions**:

- `WATINK_BUSSINES_PAT`
  - Token com permissão de escrita no repo `alltomatos/watink-bussines`
  - Escopo recomendado: `repo` (classic) ou fine-grained com `Contents: Read/Write`

## Workflows

### 1) Release Bussines Binaries
Arquivo: `.github/workflows/release-bussines-binaries.yml`

Gera e publica:
- `watink-core-linux-amd64-vX.Y.Z.tar.gz`
- `watink-core-windows-amd64-vX.Y.Z.zip`
- `SHA256SUMS.txt`
- `manifest.json`

Inputs:
- `version` (ex: `0.7.121`)
- `prerelease` (`true/false`)
- `changelog` (opcional)
- `environment_name` (ex: `production`, para ler o secret `WATINK_BUSSINES_PAT`)
- `breaking_release` (`true/false`) — marca release com quebra
- `min_compatible_from` (ex: `0.7.120`) — bloqueio de upgrade direto em versões antigas
- `migration_notes` (opcional) — instrução de migração obrigatória

### 2) Promote Bussines Release
Arquivo: `.github/workflows/promote-bussines-release.yml`

Promove (copia assets) de uma tag para outra no repo de binários.

Inputs:
- `source_tag` (ex: `v0.7.121`)
- `target_tag` (ex: `v0.7.121-stable`)
- `prerelease` (`true/false`)
- `notes` (opcional)
- `environment_name` (ex: `production`, para ler o secret `WATINK_BUSSINES_PAT`)

## Fluxo recomendado

1. Rodar `Release Bussines Binaries` com versão nova.
2. Validar em ambiente de homologação.
3. Rodar `Promote Bussines Release` para tag estável.
