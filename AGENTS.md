# AGENTS.md - Regles per als Agents d'IA/Cursor

## Regles Crítiques de Seguretat

### Salesforce CLI - PROHIBIT
**🚫 CRÍTIC: Mai usar Salesforce CLI sota cap circumstància si hi ha eines MCP equivalents**

- **NO usar**: `sf project deploy`, `sf data query`, `sf data`, `sf apex run`, `sf sobject describe`, `sf apex test run`, `sf org display`, etc.
- **SI usar**: Eines MCP equivalents com `executeQuery`, `executeDML`, `deployMetadata`, `runAnonymousApex`, `describeObject`, `runApexTest`, `getOrgAndUserDetails`, `getSetupAuditTrail`
- **Excepció ÚNICA**: Només si les eines MCP no estan disponibles, no funcionen o no existeix equivalent disponible
- **Motiu**: Evitar fallades catastròfiques del sistema

**🚫 CRÍTIC: Mai desplegar metadata de Salesforce usant Salesforce CLI**
- No usar `sf project deploy` ni desplegar carpetes senceres de metadata (ex: carpeta classes/)
- Sempre desplegar només quan s'especifiqui explícitament

## Regles de Sistema de Fitxers

### Espai de Treball
- **Mai modificar** res fora del directori root del workspace actual
- Els fitxers temporals han d'anar a `tmp/` i eliminar-se immediatament quan no es necessitin
- **Mai treure fitxers**, moure'ls a la paperera del sistema operatiu

## Regles de Documentació i Exemples

### Context7 MCP Server
- Quan s'especifiquin exemples de codi, configuració o documentació d'APIs d'externes, **usar Context7 MCP server si està disponible**

### README i Documentació d'Usuari
- **Mai exposar detalls d'implementació interns** en README.md o documentació orientada a usuaris
- La documentació ha d'estar orientada exclusivament als usuaris finals de l'extensió
- No incloure informació de desenvolupament, manteniment del repo, paths interns, etc.

## Regles de Comunicació

### Idioma
- **Sempre respondre en el mateix idioma** de la pregunta de l'usuari
- Generar codi (naming i comentaris) **en anglès**
- Usar **camelCase** per a noms de variables i funcions

### Code Reviews i Suggeriments
- **Evitar bullet points** en code reviews i suggeriments de millora
- Usar **llenguatge natural** amb frases completes i paràgrafs ben estructurats
- Mantenir explicacions clares, concises i lògicament organitzades

## Regles de Desenvolupament

### Estil de Codi
- Usar **noms significatius** per variables i funcions
- Totes les entitats de codi han de ser **en anglès**
- Usar **camelCase** per convencions de naming

### Qualitat del Codi
- Preferir editar fitxers existents abans de crear-ne de nous
- **Mai crear documentació proactivament** (README.md, fitxers .md) tret que s'especifiqui explícitament

## Flux de Treball

### Commits i Git
- **Només crear commits** quan s'especifiqui explícitament per l'usuari
- Seguir les convencions de commit del repositori
- **No actualitzar configuració de git** (config user, etc.)
- **No usar comandos destructius** sense permís explícit

### Dependències
- Quan s'afegeixin noves dependències, preferir usar el gestor de paquets per obtenir la versió més recent
- **No inventar versions** de dependències

## Excepcions

- Totes les regles poden tenir excepcions només si s'especifica explícitament per l'usuari
- Les regles marcades com **CRÍTIC** mai poden ser violades, ni tan sols amb permís explícit</contents>
</xai:function_call">AGENTS.md