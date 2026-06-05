#!/bin/bash

# Integração alltomatos/skills → Hermes Agent (~/.hermes/skills/)
# Estratégia: symlink flat — cada skill em ~/.hermes/skills/<skill-name> apontando para /opt/skills/skills/<bucket>/<skill-name>

set -uo pipefail

SOURCE_ROOT="/opt/skills/skills"
TARGET_ROOT="$HOME/.hermes/skills"
ACTIVE_BUCKETS=("engineering" "productivity" "misc")

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# 1. Limpa symlinks quebrados existentes
log "Limpando symlinks quebrados..."
cleaned=0
for entry in "$TARGET_ROOT"/*; do
    [[ -L "$entry" && ! -e "$entry" ]] && { rm "$entry"; ((cleaned++)); }
done
log "Removidos $cleaned symlinks quebrados"

# 2. Para cada bucket ativo, cria symlink flat
installed=0
skipped=0
for bucket in "${ACTIVE_BUCKETS[@]}"; do
    bucket_dir="$SOURCE_ROOT/$bucket"
    [[ ! -d "$bucket_dir" ]] && { log "Bucket ausente: $bucket"; continue; }

    log "Processando bucket: $bucket"
    for skill_dir in "$bucket_dir"/*/; do
        [[ ! -d "$skill_dir" ]] && continue
        [[ ! -f "$skill_dir/SKILL.md" ]] && continue

        skill_name=$(basename "$skill_dir")
        target="$TARGET_ROOT/$skill_name"

        # Se já existe symlink válido para o mesmo destino, pula
        if [[ -L "$target" ]]; then
            existing=$(readlink -f "$target")
            desired=$(readlink -f "$skill_dir")
            if [[ "$existing" == "$desired" ]]; then
                ((skipped++))
                continue
            fi
            rm "$target"
        fi

        # Se existe diretório real (não symlink), pula para não sobrescrever skill nativa
        if [[ -d "$target" && ! -L "$target" ]]; then
            log "SKIP (dir real existe): $skill_name — skill nativa do Hermes, não sobrescrever"
            ((skipped++))
            continue
        fi

        ln -s "$skill_dir" "$target"
        log "OK: $skill_name → $skill_dir"
        ((installed++))
    done
done

log "Instaladas: $installed | Skipped: $skipped"

# 3. Verificação
log "Verificando..."
ok=0
fail=0
for entry in "$TARGET_ROOT"/*; do
    [[ ! -L "$entry" ]] && continue
    name=$(basename "$entry")
    if [[ -f "$entry/SKILL.md" ]]; then
        ((ok++))
    else
        log "FALHA: $name (SKILL.md não acessível)"
        ((fail++))
    fi
done
log "Verificação: $ok OK, $fail falhas"
log "Concluído."
