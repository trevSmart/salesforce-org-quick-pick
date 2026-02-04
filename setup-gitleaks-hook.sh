#!/bin/bash

# Script per configurar automàticament el pre-commit hook de Gitleaks

set -e

echo "=========================================="
echo "  Gitleaks Pre-commit Hook Setup"
echo "=========================================="
echo ""

# Verificar que estem en un repositori git
if [ ! -d ".git" ]; then
    echo "❌ ERROR: Aquest directori no és un repositori git"
    exit 1
fi

# Verificar si Gitleaks està instal·lat
if ! command -v gitleaks &> /dev/null; then
    echo "⚠️  Gitleaks no està instal·lat"
    echo ""
    echo "Instal·lació:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin"
    echo "  Windows: choco install gitleaks"
    echo ""
    read -p "Vols continuar igualment? (y/n): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Gitleaks està instal·lat: $(gitleaks version)"
fi

echo ""

# Crear el directori de hooks si no existeix
mkdir -p .git/hooks

# Crear el pre-commit hook
echo "Creant pre-commit hook..."

cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Gitleaks pre-commit hook
# Detecta secrets abans de fer commit

echo "🔍 Running Gitleaks to check for secrets..."

# Verificar si gitleaks està instal·lat
if ! command -v gitleaks &> /dev/null; then
    echo "⚠️  WARNING: Gitleaks is not installed"
    echo "Secrets detection is disabled. Please install Gitleaks:"
    echo "  macOS:   brew install gitleaks"
    echo "  Linux:   curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin"
    echo "  Windows: choco install gitleaks"
    echo ""
    read -p "Continue without secret scanning? (y/n): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    exit 0
fi

# Executar gitleaks en fitxers staged
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

echo "✅ No secrets detected - commit allowed"
exit 0
EOF

# Fer executable el hook
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook creat i configurat"
echo ""

# Testejar el hook
echo "Testejant el hook..."
if .git/hooks/pre-commit; then
    echo "✅ Hook funciona correctament"
else
    echo "⚠️  El hook ha fallat al test inicial"
    echo "Això pot ser normal si no hi ha fitxers staged o si gitleaks no està instal·lat"
fi

echo ""
echo "=========================================="
echo "  Setup Complet!"
echo "=========================================="
echo ""
echo "El pre-commit hook està configurat."
echo "Ara Gitleaks escanejarà automàticament els commits per secrets."
echo ""
echo "Per saltar el hook (només si és necessari):"
echo "  git commit --no-verify"
echo ""
echo "Per testejar manualment:"
echo "  gitleaks protect --staged --verbose"
echo ""
