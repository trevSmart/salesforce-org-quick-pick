#!/bin/bash

# Script per eliminar secrets del fitxer .env de l'historial de git
# ADVERTÈNCIA: Aquest script reescriu l'historial de git. Fer un backup abans d'executar.

set -e  # Exit on error

echo "=========================================="
echo "  Git History Secret Removal Script"
echo "=========================================="
echo ""
echo "ADVERTÈNCIA: Aquest script reescriurà l'historial de git."
echo "Assegura't de:"
echo "  1. Haver invalidat TOTS els tokens exposats"
echo "  2. Tenir un backup del repositori"
echo "  3. Notificar a tots els col·laboradors"
echo ""

# Verificar que estem al directori del repositori
if [ ! -d ".git" ]; then
    echo "ERROR: Aquest script s'ha d'executar des del directori arrel del repositori git."
    exit 1
fi

# Demanar confirmació
read -p "Has invalidat tots els tokens exposats i tens un backup? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Operació cancel·lada. Invalida els tokens i fes un backup abans de continuar."
    exit 1
fi

echo ""
echo "Opcions disponibles:"
echo "  1) Utilitzar git-filter-repo (Recomanat)"
echo "  2) Utilitzar BFG Repo-Cleaner"
echo "  3) Cancel·lar"
echo ""
read -p "Selecciona una opció (1-3): " -r option
echo

case $option in
    1)
        echo "Utilitzant git-filter-repo..."
        
        # Verificar que git-filter-repo està instal·lat
        if ! command -v git-filter-repo &> /dev/null; then
            echo "ERROR: git-filter-repo no està instal·lat."
            echo ""
            echo "Instal·lació:"
            echo "  macOS:   brew install git-filter-repo"
            echo "  Ubuntu:  sudo apt-get install git-filter-repo"
            echo "  Altres:  https://github.com/newren/git-filter-repo/blob/main/INSTALL.md"
            exit 1
        fi
        
        # Crear backup automàtic
        echo "Creant backup del repositori..."
        parent_dir=$(dirname "$(pwd)")
        backup_dir="${parent_dir}/$(basename "$(pwd)")-backup-$(date +%Y%m%d-%H%M%S).git"
        git clone --mirror . "$backup_dir"
        echo "Backup creat a: $backup_dir"
        echo ""
        
        # Guardar la URL del remote
        remote_url=$(git remote get-url origin 2>/dev/null || echo "")
        
        # Executar git-filter-repo
        echo "Eliminant .env de l'historial..."
        git filter-repo --invert-paths --path .env --force
        
        # Restaurar el remote
        if [ -n "$remote_url" ]; then
            echo "Afegint el remote origin de nou..."
            git remote add origin "$remote_url"
        fi
        
        echo ""
        echo "✅ Historial netejat amb èxit!"
        ;;
        
    2)
        echo "Utilitzant BFG Repo-Cleaner..."
        
        # Verificar que BFG està instal·lat
        if ! command -v bfg &> /dev/null; then
            echo "ERROR: BFG no està instal·lat."
            echo ""
            echo "Instal·lació:"
            echo "  macOS:   brew install bfg"
            echo "  Altres:  https://rtyley.github.io/bfg-repo-cleaner/"
            exit 1
        fi
        
        # Crear backup automàtic
        echo "Creant backup del repositori..."
        parent_dir=$(dirname "$(pwd)")
        backup_dir="${parent_dir}/$(basename "$(pwd)")-backup-$(date +%Y%m%d-%H%M%S).git"
        git clone --mirror . "$backup_dir"
        echo "Backup creat a: $backup_dir"
        echo ""
        
        # Executar BFG
        echo "Eliminant .env de l'historial..."
        bfg --delete-files .env
        
        # Netejar referències
        echo "Netejant referències..."
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
        
        echo ""
        echo "✅ Historial netejat amb èxit!"
        ;;
        
    3)
        echo "Operació cancel·lada."
        exit 0
        ;;
        
    *)
        echo "Opció invàlida."
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  Verificació"
echo "=========================================="
echo ""

# Verificar que .env no apareix en l'historial
if git log --all --full-history --source -- .env | grep -q .; then
    echo "⚠️  ADVERTÈNCIA: .env encara apareix en algun commit"
    git log --all --full-history --source --oneline -- .env
else
    echo "✅ .env eliminat correctament de l'historial"
fi

echo ""

# Buscar mencions a VSCE_TOKEN
if git log -S "VSCE_TOKEN" --all --source | grep -q .; then
    echo "⚠️  ADVERTÈNCIA: S'han trobat mencions a VSCE_TOKEN en l'historial"
    git log -S "VSCE_TOKEN" --all --source --oneline
else
    echo "✅ No s'han trobat mencions a VSCE_TOKEN en l'historial"
fi

echo ""
echo "=========================================="
echo "  Següents Passos"
echo "=========================================="
echo ""
echo "1. Revisar els canvis localment"
echo "2. Executar: git push origin --force --all"
echo "3. Executar: git push origin --force --tags"
echo "4. Notificar als col·laboradors que han de re-clonar el repositori"
echo ""
echo "IMPORTANT: Assegura't que tots els tokens exposats han estat invalidats!"
echo ""
