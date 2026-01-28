# 📚 Índex de Documentació de Seguretat

Aquesta és la guia d'índex per navegar per la documentació de seguretat del repositori.

## 🚨 PER ON COMENÇAR?

**Si has rebut una alerta de secret exposat**, comença per aquí:

### 👉 [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
**Checklist visual pas a pas amb totes les accions requerides**
- Checklist interactiva amb checkboxes
- Passos clars i ordenats
- Verificacions al final de cada pas

## 📖 Documentació Completa

### Guies Principals

| Fitxer | Descripció | Quan utilitzar-lo |
|--------|------------|-------------------|
| **[SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)** | ✅ Checklist pas a pas | Començar aquí - És la teva guia principal |
| **[QUICK_START.md](QUICK_START.md)** | 🚀 Guia ràpida | Si vols un resum executiu ràpid |
| **[SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md)** | 📚 Guia completa | Si necessites detalls en profunditat |
| **[GITLEAKS_SETUP.md](GITLEAKS_SETUP.md)** | 🛡️ Configuració de Gitleaks | Per configurar prevenció de secrets |

### Scripts Automatitzats

| Script | Descripció | Ús |
|--------|------------|-----|
| **[remove-secrets.sh](remove-secrets.sh)** | Elimina secrets de l'historial de git | `./remove-secrets.sh` |
| **[setup-gitleaks-hook.sh](setup-gitleaks-hook.sh)** | Configura pre-commit hook | `./setup-gitleaks-hook.sh` |

### Fitxers de Configuració

| Fitxer | Descripció |
|--------|------------|
| **[.env.example](.env.example)** | Template per variables d'entorn |
| **[gitleaks.toml](gitleaks.toml)** | Configuració de Gitleaks |
| **[.gitleaksignore](.gitleaksignore)** | Falsos positius de Gitleaks |

### GitHub Actions

| Workflow | Descripció |
|----------|------------|
| **[security-gitleaks.yml](.github/workflows/security-gitleaks.yml)** | Escanneig automàtic de secrets en CI/CD |

## 🔄 Flux de Treball Recomanat

```
1. Llegir SECURITY_CHECKLIST.md
         ↓
2. Invalidar tokens exposats (URGENT!)
         ↓
3. Executar ./remove-secrets.sh
         ↓
4. Verificar que l'historial està net
         ↓
5. Executar ./setup-gitleaks-hook.sh
         ↓
6. ✅ Completat!
```

## ❓ Preguntes Freqüents

### "Per on començo?"
👉 Llegeix [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)

### "Com elimino els secrets de l'historial?"
👉 Executa `./remove-secrets.sh` (documentat a [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md))

### "Com prevenir futures exposicions?"
👉 Executa `./setup-gitleaks-hook.sh` (documentat a [GITLEAKS_SETUP.md](GITLEAKS_SETUP.md))

### "Necessito detalls tècnics?"
👉 Llegeix [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md)

### "Vull una guia ràpida?"
👉 Llegeix [QUICK_START.md](QUICK_START.md)

## 📋 Estat Actual del Repositori

- ✅ Fitxer .env eliminat del working tree
- ✅ .env afegit al .gitignore
- ✅ .env.example creat com a template
- ✅ Gitleaks configurat (gitleaks.toml)
- ✅ Pre-commit hook disponible (setup-gitleaks-hook.sh)
- ✅ GitHub Actions workflow per escanneig automàtic
- ✅ Scripts d'automatització creats
- ⚠️ **PENDENT**: Secrets encara presents en l'historial de git
- ⚠️ **PENDENT**: Tokens exposats necessiten ser invalidats

## 🎯 Accions Pendents Crítiques

1. **URGENT**: Invalidar tokens VSCE_TOKEN i OPEN_VSX_TOKEN
2. **URGENT**: Executar `./remove-secrets.sh` per netejar l'historial
3. Configurar nous tokens a GitHub Secrets
4. Executar `./setup-gitleaks-hook.sh` per prevenir futures exposicions

## 📞 Recursos Addicionals

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [Git Filter Repo](https://github.com/newren/git-filter-repo)
- [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**Última actualització**: 2026-01-28  
**Estat**: 🔴 Acció requerida - Secrets exposats en l'historial

---

## 📂 Estructura de Fitxers

```
Salesforce-Org-Quick-Pick/
├── SECURITY_INDEX.md              ← Aquest fitxer (començar aquí)
├── SECURITY_CHECKLIST.md          ← Checklist pas a pas
├── QUICK_START.md                 ← Guia ràpida
├── SECURITY_REMEDIATION.md        ← Guia completa
├── GITLEAKS_SETUP.md              ← Configuració de Gitleaks
├── .env.example                   ← Template d'entorn
├── gitleaks.toml                  ← Config de Gitleaks
├── .gitleaksignore                ← Falsos positius
├── remove-secrets.sh              ← Script per netejar historial
├── setup-gitleaks-hook.sh         ← Script per configurar hook
└── .github/
    ├── README.md                  ← Documentació de workflows
    └── workflows/
        └── security-gitleaks.yml  ← Workflow de seguretat
```
