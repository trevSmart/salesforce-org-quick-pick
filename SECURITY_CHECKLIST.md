# 🔐 Checklist de Seguretat - Remediació de Secrets

## ⚠️ ACCIONS IMMEDIATES (FER ARA MATEIX)

### 🚨 Pas 1: Invalidar Tokens Exposats
- [ ] **VSCE_TOKEN**: Anar a https://marketplace.visualstudio.com/manage/publishers/
  - [ ] Revocar el Personal Access Token actual
  - [ ] Generar un nou token
  - [ ] Copiar el nou token (ho necessitaràs després)

- [ ] **OPEN_VSX_TOKEN** (si estava exposat): Anar a https://open-vsx.org/user-settings/tokens
  - [ ] Revocar el token actual
  - [ ] Generar un nou token
  - [ ] Copiar el nou token

**Per què és urgent?** Qualsevol persona amb accés a l'historial del repositori pot haver copiat els tokens.

---

## 🔧 Pas 2: Configurar Nous Tokens

### Per GitHub Actions
- [ ] Anar a https://github.com/trevSmart/Salesforce-Org-Quick-Pick/settings/secrets/actions
- [ ] Crear/actualitzar secret `VSCE_TOKEN` amb el nou valor
- [ ] Crear/actualitzar secret `OPEN_VSX_TOKEN` amb el nou valor

### Per Desenvolupament Local
```bash
# [ ] Executar:
cp .env.example .env

# [ ] Editar .env i afegir els nous tokens:
#     VSCE_TOKEN=el_teu_nou_token_aqui
#     OPEN_VSX_TOKEN=el_teu_altre_nou_token_aqui
```

**Nota**: El fitxer `.env` està al `.gitignore` i mai es farà commit.

---

## 🧹 Pas 3: Netejar l'Historial de Git

### Opció A: Script Automatitzat (Recomanat)
```bash
# [ ] Executar:
./remove-secrets.sh

# Seguir les instruccions de l'script
```

### Opció B: Manual
Si prefereixes fer-ho manualment, seguir les instruccions a `SECURITY_REMEDIATION.md`.

---

## ✅ Pas 4: Verificar que l'Historial està Net

```bash
# [ ] Executar aquestes comandes (no haurien de retornar res):
git log --all --full-history -- .env
git log -S "VSCE_TOKEN" --all
```

Si no retornen res, l'historial està net. ✅

---

## 🚀 Pas 5: Publicar els Canvis

```bash
# [ ] Executar:
git push origin --force --all
git push origin --force --tags
```

**Nota**: És necessari `--force` perquè hem reescrit l'historial.

---

## 🛡️ Pas 6: Prevenir Futures Exposicions

### Instal·lar Gitleaks
```bash
# [ ] En macOS:
brew install gitleaks

# [ ] En Linux:
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin

# [ ] En Windows:
choco install gitleaks
```

### Configurar Pre-commit Hook
```bash
# [ ] Executar:
./setup-gitleaks-hook.sh
```

Ara Gitleaks escannejarà automàticament cada commit! 🎉

---

## 👥 Pas 7: Notificar Col·laboradors (si n'hi ha)

Si hi ha altres persones treballant en el repositori:

- [ ] Notificar-los que l'historial s'ha reescrit
- [ ] Demanar-los que executin:
  ```bash
  # NO fer git pull
  rm -rf Salesforce-Org-Quick-Pick
  git clone https://github.com/trevSmart/Salesforce-Org-Quick-Pick.git
  ```

---

## 📋 Checklist Final de Verificació

- [ ] Tokens antics revocats ✅
- [ ] Nous tokens creats i emmagatzemats ✅
- [ ] GitHub Secrets actualitzats ✅
- [ ] Fitxer .env local creat (no commitejat) ✅
- [ ] Historial de git netejat ✅
- [ ] Verificat que no hi ha secrets en l'historial ✅
- [ ] Push forçat completat ✅
- [ ] Gitleaks instal·lat ✅
- [ ] Pre-commit hook configurat ✅
- [ ] Col·laboradors notificats (si n'hi ha) ✅

---

## 📚 Documentació Addicional

- **QUICK_START.md** - Guia ràpida de remediació
- **SECURITY_REMEDIATION.md** - Guia completa i detallada
- **GITLEAKS_SETUP.md** - Configuració de Gitleaks
- **README.md** - Secció de seguretat actualitzada

---

## ❓ Ajuda

Si tens problemes en qualsevol pas:

1. Consultar `SECURITY_REMEDIATION.md` per instruccions detallades
2. Revisar la documentació de Git: https://git-scm.com/docs
3. Consultar GitHub Docs: https://docs.github.com

---

## ✨ Bones Pràctiques per Recordar

1. ✅ **Mai commitejis secrets** - Utilitzar sempre variables d'entorn
2. ✅ **Revisar abans de commit** - Executar `git diff` abans de `git commit`
3. ✅ **Utilitzar GitHub Secrets** per CI/CD
4. ✅ **Rotar tokens regularment** - Cada 3-6 mesos
5. ✅ **Permisos mínims** - Tokens només amb permisos necessaris
6. ✅ **Pre-commit hooks** - Gitleaks ho fa automàtic

---

**Última actualització**: 2026-01-28

**Estat**: 🔴 Acció requerida - Seguir els passos d'aquesta checklist
