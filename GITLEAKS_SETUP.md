# Gitleaks Pre-commit Hook Setup

Aquest repositori utilitza [Gitleaks](https://github.com/gitleaks/gitleaks) per detectar secrets abans de fer commit.

## Instal·lació Automàtica

Executar l'script d'instal·lació:

```bash
./setup-gitleaks-hook.sh
```

## Instal·lació Manual

### 1. Instal·lar Gitleaks

#### macOS
```bash
brew install gitleaks
```

#### Linux (Ubuntu/Debian)
```bash
# Opció 1: Utilitzar el script d'instal·lació oficial
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin

# Opció 2: Des del repositori
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

#### Windows
```powershell
# Utilitzant chocolatey
choco install gitleaks

# O descarregar des de: https://github.com/gitleaks/gitleaks/releases
```

### 2. Configurar el Pre-commit Hook

Crear el fitxer `.git/hooks/pre-commit`:

```bash
#!/bin/bash

echo "Running Gitleaks to check for secrets..."

# Run gitleaks
gitleaks protect --staged --verbose --redact

if [ $? -eq 1 ]; then
    echo ""
    echo "⛔ Gitleaks has detected potential secrets in your commit!"
    echo ""
    echo "Please review the findings above and:"
    echo "  1. Remove any actual secrets from your files"
    echo "  2. Add false positives to .gitleaksignore or gitleaks.toml allowlist"
    echo "  3. If you're absolutely sure this is safe, use: git commit --no-verify"
    echo ""
    exit 1
fi

echo "✅ No secrets detected"
exit 0
```

Fer-lo executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Configuració

El fitxer `gitleaks.toml` conté la configuració de Gitleaks per aquest repositori:

- Regles per detectar tokens de VSCE i Open VSX
- Regles per detectar tokens de Salesforce
- Regles genèriques per secrets en fitxers .env
- Allowlist per fitxers d'exemple i documentació

## Ús

### Executar Manualment

```bash
# Escanejar tots els fitxers
gitleaks detect --verbose

# Escanejar només fitxers staged
gitleaks protect --staged --verbose

# Escanejar l'historial complet
gitleaks detect --verbose --log-opts="--all"
```

### Saltar el Hook (Només si Necessari)

Si estàs completament segur que els canvis són segurs:

```bash
git commit --no-verify -m "Your commit message"
```

**ADVERTÈNCIA**: Només utilitzar `--no-verify` en casos molt específics i després de revisar manualment.

## Ignorar Falsos Positius

Si Gitleaks detecta un fals positiu, pots afegir-lo a `.gitleaksignore`:

```bash
# Format: path:lineNumber
src/example.ts:42
README.md:15-20
```

O actualitzar l'allowlist a `gitleaks.toml`.

## CI/CD Integration

Gitleaks també s'hauria d'integrar en els workflows de CI/CD:

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Recursos

- [Gitleaks GitHub](https://github.com/gitleaks/gitleaks)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks/wiki)
- [Configuration Examples](https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml)
