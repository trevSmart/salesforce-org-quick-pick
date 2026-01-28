# GitHub Workflows

Aquest directori conté els workflows de GitHub Actions per al repositori.

## Workflows Disponibles

### 1. CodeQL Analysis (`codeql.yml`)
- **Propòsit**: Anàlisi de seguretat del codi amb CodeQL
- **Quan s'executa**: En push i pull requests a les branques principals
- **Què fa**: Escaneja el codi per vulnerabilitats de seguretat

### 2. Publish Extension (`publish.yml`)
- **Propòsit**: Publicar l'extensió a Visual Studio Marketplace i Open VSX Registry
- **Quan s'executa**: Manualment via workflow_dispatch
- **Secrets requerits**:
  - `VSCE_TOKEN`: Token de Visual Studio Marketplace
  - `OPEN_VSX_TOKEN`: Token de Open VSX Registry

### 3. Security - Gitleaks (`security-gitleaks.yml`)
- **Propòsit**: Escannejar commits per secrets exposats
- **Quan s'executa**: En push i pull requests a main/develop
- **Què fa**:
  - Escaneja tots els fitxers commitejats buscant secrets
  - Carrega un report si detecta secrets
  - Comenta en PRs si troba problemes
- **Configuració**: `gitleaks.toml` a l'arrel del repositori

## Secrets de GitHub

Els workflows necessiten els següents secrets configurats a:
`Settings → Secrets and variables → Actions`

### Secrets Requerits

| Secret | Descripció | On obtenir-lo |
|--------|------------|---------------|
| `VSCE_TOKEN` | Token de Visual Studio Marketplace | [Manage Publishers](https://marketplace.visualstudio.com/manage/publishers/) |
| `OPEN_VSX_TOKEN` | Token de Open VSX Registry | [User Settings](https://open-vsx.org/user-settings/tokens) |

### Configurar Secrets

1. Anar a https://github.com/trevSmart/Salesforce-Org-Quick-Pick/settings/secrets/actions
2. Clicar "New repository secret"
3. Afegir nom i valor del secret
4. Clicar "Add secret"

## Bones Pràctiques

1. **Mai commitejis secrets** - Utilitzar sempre GitHub Secrets
2. **Rotar tokens regularment** - Canviar tokens cada 3-6 mesos
3. **Permisos mínims** - Crear tokens només amb permisos necessaris
4. **Revisar workflows** - Abans de fer merge, verificar que els workflows passen

## Workflow de Seguretat

El workflow `security-gitleaks.yml` s'executa automàticament per:

- ✅ Prevenir que secrets es commitejin al repositori
- ✅ Detectar tokens, passwords i altres dades sensibles
- ✅ Bloquejar PRs que continguin secrets
- ✅ Generar reports detallats de vulnerabilitats

Si el workflow detecta un secret:
1. Revisar el report de Gitleaks
2. Eliminar el secret del codi
3. Si és un fals positiu, afegir-lo a `.gitleaksignore`
4. Tornar a executar el workflow

## Debugging Workflows

Per veure els logs d'execució:
1. Anar a la pestanya "Actions" del repositori
2. Seleccionar el workflow que vols revisar
3. Clicar en l'execució específica
4. Expandir els steps per veure els logs detallats

## Recursos

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [CodeQL Documentation](https://codeql.github.com/)
- [VS Code Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
