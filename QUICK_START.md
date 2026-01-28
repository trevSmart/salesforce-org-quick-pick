# Remediació de Secrets - Guia Ràpida

## Situació Actual

S'han detectat secrets (tokens VSCE_TOKEN i possiblement OPEN_VSX_TOKEN) exposats en l'historial de git del repositori. Encara que el fitxer `.env` ja s'ha eliminat del repositori actual i està al `.gitignore`, els secrets continuen accessibles en commits antics a GitHub.

## ⚠️ ACCIONS URGENTS REQUERIDES

### 1. **PRIORITAT MÀXIMA: Invalidar Tokens Immediatament**

Abans de fer qualsevol altra cosa:

#### VSCE_TOKEN (Visual Studio Marketplace)
1. Anar a: https://marketplace.visualstudio.com/manage/publishers/
2. Trobar el Personal Access Token exposat
3. **REVOCAR-LO IMMEDIATAMENT**
4. Generar un nou token
5. Emmagatzemar-lo de forma segura (veure més avall)

#### OPEN_VSX_TOKEN (si estava exposat)
1. Anar a: https://open-vsx.org/user-settings/tokens
2. **REVOCAR el token exposat**
3. Generar un nou token
4. Emmagatzemar-lo de forma segura

**NOTA CRÍTICA**: Encara que es netegi l'historial, qualsevol persona amb accés previ al repositori pot haver copiat els tokens. La invalidació és **obligatòria**.

### 2. Emmagatzemar els Nous Tokens de Forma Segura

#### Per a Desenvolupament Local
```bash
# Copiar el template
cp .env.example .env

# Editar .env i afegir els nous tokens
# AQUEST FITXER ESTÀ AL .gitignore I MAI ES FARÀ COMMIT
```

#### Per a GitHub Actions
1. Anar a: https://github.com/trevSmart/Salesforce-Org-Quick-Pick/settings/secrets/actions
2. Crear/actualitzar aquests secrets:
   - `VSCE_TOKEN`: El nou token de Visual Studio Marketplace
   - `OPEN_VSX_TOKEN`: El nou token de Open VSX Registry

### 3. Eliminar Secrets de l'Historial de Git

Tens tres opcions:

#### Opció A: Script Automatitzat (Recomanat per facilitat)
```bash
./remove-secrets.sh
```

Aquest script et guiarà pel procés d'eliminació utilitzant git-filter-repo o BFG.

#### Opció B: Manual amb git-filter-repo
```bash
# Instal·lar
brew install git-filter-repo  # macOS
# o sudo apt-get install git-filter-repo  # Linux

# Fer backup
git clone --mirror . ../backup.git

# Eliminar .env de l'historial
git filter-repo --invert-paths --path .env --force

# Restaurar remote i fer push forçat
git remote add origin https://github.com/trevSmart/Salesforce-Org-Quick-Pick.git
git push origin --force --all
git push origin --force --tags
```

#### Opció C: Contactar GitHub Support
Si prefereixes no fer-ho manualment, contactar: https://support.github.com/contact

### 4. Verificar que l'Historial està Net
```bash
# No hauria de retornar res:
git log --all --full-history -- .env
git log -S "VSCE_TOKEN" --all
```

### 5. Notificar Col·laboradors

Després de reescriure l'historial, **tots els col·laboradors** hauran de:
```bash
# NO fer git pull - l'historial s'ha reescrit
rm -rf Salesforce-Org-Quick-Pick
git clone https://github.com/trevSmart/Salesforce-Org-Quick-Pick.git
```

## 🛡️ Prevenir Futures Exposicions

### Configurar Gitleaks (Pre-commit Hook)

```bash
# Instal·lar Gitleaks
brew install gitleaks  # macOS
# o seguir instruccions a GITLEAKS_SETUP.md

# Configurar el hook automàticament
./setup-gitleaks-hook.sh
```

Ara Gitleaks escannejarà automàticament cada commit per secrets abans de permetre'l.

### Bones Pràctiques

1. **Mai fer commit de .env**: El fitxer ja està al `.gitignore`
2. **Utilitzar GitHub Secrets** per CI/CD (ja configurat a `.github/workflows/`)
3. **Revisar abans de commit**: Executar `git diff` abans de `git commit`
4. **Rotar tokens regularment**: Canviar tokens cada 3-6 mesos
5. **Permisos mínims**: Crear tokens només amb els permisos necessaris

## 📁 Fitxers Creats/Actualitzats

### Documentació
- `SECURITY_REMEDIATION.md` - Guia completa de remediació
- `GITLEAKS_SETUP.md` - Instruccions detallades de Gitleaks
- `QUICK_START.md` - Aquest fitxer (guia ràpida)
- `README.md` - Actualitzat amb secció de seguretat

### Scripts
- `remove-secrets.sh` - Script automatitzat per eliminar secrets de l'historial
- `setup-gitleaks-hook.sh` - Script per configurar pre-commit hook

### Configuració
- `.env.example` - Template per variables d'entorn
- `gitleaks.toml` - Configuració de Gitleaks
- `.gitleaksignore` - Per ignorar falsos positius
- `.github/workflows/security-gitleaks.yml` - Workflow de CI per escanneig automàtic

## 🔄 Flux de Treball Recomanat

1. ✅ **Invalidar tokens exposats** (URGENT - fer ara mateix)
2. ✅ Emmagatzemar nous tokens a GitHub Secrets
3. ✅ Copiar `.env.example` a `.env` i afegir tokens locals
4. ✅ Executar `./remove-secrets.sh` per netejar l'historial
5. ✅ Verificar que l'historial està net
6. ✅ Fer push forçat a GitHub
7. ✅ Executar `./setup-gitleaks-hook.sh` per prevenir futures exposicions
8. ✅ Notificar col·laboradors per re-clonar

## ❓ Preguntes Freqüents

**Q: He de fer push --force?**  
A: Sí, perquè estàs reescrivint l'historial. És segur en aquest cas perquè és per seguretat.

**Q: Què passa si algú ja ha clonat el repositori?**  
A: Els seus clons locals encara tindran els secrets. Per això cal invalidar els tokens IMMEDIATAMENT.

**Q: Puc saltar el hook de Gitleaks?**  
A: Sí, amb `git commit --no-verify`, però **només** si estàs 100% segur que no hi ha secrets.

**Q: I si GitHub Secret Scanning ha detectat el secret?**  
A: Revocar el token immediatament. GitHub pot haver notificat l'exposició. Després de netejar l'historial i invalidar el token, l'alerta es resoldrà.

## 📞 Suport

Per més detalls, consultar:
- `SECURITY_REMEDIATION.md` - Guia completa
- `GITLEAKS_SETUP.md` - Configuració de Gitleaks
- GitHub Docs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository

---

**Recordatori**: La seguretat és prioritària. Pren-te el temps necessari per fer-ho bé.
