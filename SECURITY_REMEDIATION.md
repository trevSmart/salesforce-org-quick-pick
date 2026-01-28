# Remediació de Secrets Exposats en l'Historial de Git

## Problema Identificat

S'han detectat secrets sensibles (tokens) exposats en l'historial de git del repositori, específicament en els següents commits:

- **Commit 295299059b03d7ee1067687d41990eac21b39987**: "Add VSCE_TOKEN to .env"
- **Commit 222faa5f2ddba5b1076f9227d1aa90131397f0da**: "Remove sensitive tokens from .env"

Encara que el fitxer `.env` ja s'ha eliminat del repositori i s'ha afegit al `.gitignore`, els secrets continuen accessibles en l'historial de git a GitHub.

## Passos Crítics de Seguretat

### 1. **URGENT: Invalidar els Tokens Compromesos**

Abans de res, és **CRÍTIC** invalidar immediatament els tokens exposats:

- **VSCE_TOKEN**: Revocar el token a Visual Studio Marketplace
  - Anar a: https://marketplace.visualstudio.com/manage/publishers/
  - Revocar/regenerar el Personal Access Token compromès
  - Crear un nou token i emmagatzemar-lo de forma segura (GitHub Secrets, variables d'entorn locals, etc.)

- **OPEN_VSX_TOKEN** (si estava exposat): Revocar a Open VSX Registry
  - Anar a: https://open-vsx.org/user-settings/tokens
  - Revocar el token compromès
  - Generar un nou token

**IMPORTANT**: Encara que es netegi l'historial, qualsevol persona que hagi clonat el repositori o tingui accés a l'historial anterior pot haver copiat els tokens. Per això, la invalidació és **obligatòria** i **urgent**.

### 2. Eliminar els Secrets de l'Historial de Git

Hi ha diverses opcions per eliminar secrets de l'historial de git. Aquí estan les recomanades:

#### Opció A: Utilitzar `git-filter-repo` (Recomanada)

`git-filter-repo` és l'eina oficial recomanada per Git per reescriure l'historial.

```bash
# Instal·lar git-filter-repo
# En macOS:
brew install git-filter-repo

# En Linux (Ubuntu/Debian):
sudo apt-get install git-filter-repo

# En altres sistemes, seguir: https://github.com/newren/git-filter-repo/blob/main/INSTALL.md

# Fer un backup complet del repositori
cd /path/to/Salesforce-Org-Quick-Pick
git clone --mirror . ../Salesforce-Org-Quick-Pick-backup.git

# Eliminar el fitxer .env de tot l'historial
git filter-repo --invert-paths --path .env --force

# Afegir el remote de nou (git-filter-repo l'elimina per seguretat)
git remote add origin https://github.com/trevSmart/Salesforce-Org-Quick-Pick.git

# Fer push amb --force per reescriure l'historial a GitHub
git push origin --force --all
git push origin --force --tags
```

#### Opció B: Utilitzar BFG Repo-Cleaner

BFG és més ràpid però menys flexible que git-filter-repo.

```bash
# Descarregar BFG: https://rtyley.github.io/bfg-repo-cleaner/
# O amb brew:
brew install bfg

# Fer un backup
cd /path/to/Salesforce-Org-Quick-Pick
git clone --mirror . ../Salesforce-Org-Quick-Pick-backup.git

# Eliminar el fitxer .env
bfg --delete-files .env

# Netejar les referències
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Fer push forçat
git push origin --force --all
git push origin --force --tags
```

#### Opció C: Contactar GitHub Support

Si prefereixes no fer-ho manualment, pots contactar GitHub Support per demanar-los que eliminin l'historial que conté els secrets:

1. Anar a: https://support.github.com/contact
2. Seleccionar "Repository & Account Settings" > "Remove sensitive data"
3. Proporcionar els SHAs dels commits amb secrets
4. Esperar que GitHub processi la sol·licitud

### 3. Verificar que l'Historial s'ha Netejat

```bash
# Verificar que .env no apareix en cap commit
git log --all --full-history --source -- .env

# Buscar qualsevol menció a VSCE_TOKEN en l'historial
git log -S "VSCE_TOKEN" --all --source

# Si aquestes comandes no retornen resultats, l'historial està net
```

### 4. Notificar als Col·laboradors

Després de reescriure l'historial, tots els col·laboradors hauran de:

```bash
# Eliminar els seus clons locals
rm -rf Salesforce-Org-Quick-Pick

# Clonar de nou el repositori
git clone https://github.com/trevSmart/Salesforce-Org-Quick-Pick.git
```

**NO** haurien de fer `git pull` perquè l'historial s'ha reescrit.

## Bones Pràctiques per Prevenir Futures Exposicions

### 1. Utilitzar GitHub Secrets per CI/CD

Per workflows de GitHub Actions, utilitzar sempre **GitHub Secrets**:

```yaml
# .github/workflows/publish.yml
- name: Publish to VS Marketplace
  env:
    VSCE_TOKEN: ${{ secrets.VSCE_TOKEN }}
    OPEN_VSX_TOKEN: ${{ secrets.OPEN_VSX_TOKEN }}
```

### 2. Fitxer .env.example

Crear un fitxer `.env.example` amb les claus però sense valors:

```bash
# .env.example
VSCE_TOKEN=your_token_here
OPEN_VSX_TOKEN=your_token_here
```

I afegir al README:

```markdown
## Configuració Local

1. Copiar `.env.example` a `.env`
2. Omplir els valors reals al fitxer `.env`
3. El fitxer `.env` està al `.gitignore` i **MAI** s'ha de fer commit
```

### 3. Pre-commit Hooks

Instal·lar hooks de git per prevenir commits de secrets:

```bash
# Instal·lar gitleaks
brew install gitleaks

# O afegir com a pre-commit hook
npm install --save-dev @commitlint/cli husky lint-staged
```

Afegir a `package.json`:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*": [
      "gitleaks protect --staged --verbose --redact"
    ]
  }
}
```

### 4. Activar GitHub Secret Scanning

GitHub proporciona secret scanning gratuït per repositoris públics. Assegurar-se que està activat:

1. Anar a Settings > Code security and analysis
2. Activar "Secret scanning"
3. Activar "Push protection" (si està disponible)

### 5. Revisar Regularment

- Fer auditories periòdiques del codi
- Rotar tokens regularment
- Utilitzar tokens amb permisos mínims necessaris
- Establir dates de caducitat per tokens quan sigui possible

## Recursos Addicionals

- [Removing sensitive data from a repository - GitHub Docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [Gitleaks - Protect your secrets](https://github.com/gitleaks/gitleaks)

## Checklist de Seguretat

- [ ] Tokens compromesos invalidats i regenerats
- [ ] Nous tokens emmagatzemats de forma segura (GitHub Secrets)
- [ ] Historial de git netejat amb git-filter-repo o BFG
- [ ] Verificat que no hi ha secrets en l'historial
- [ ] Push forçat a GitHub completat
- [ ] Col·laboradors notificats per re-clonar el repositori
- [ ] Pre-commit hooks instal·lats per prevenir futures exposicions
- [ ] Secret scanning activat a GitHub
- [ ] Documentació actualitzada amb bones pràctiques
