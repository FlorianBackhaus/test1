# n8n MCP Server

MCP Server für Claude Code, um n8n Workflows zu verwalten.

## Erlaubte Operationen
- Workflows auflisten, lesen, erstellen, updaten, suchen, duplizieren
- Credentials auflisten und Schemas abrufen (nur lesen, keine Secrets)
- Tags auflisten, erstellen, umbenennen
- Variables (Umgebungsvariablen) auflisten, erstellen, updaten
- Executions ansehen, Details abrufen, löschen (zum Debugging/Aufräumen)
- Templates suchen, abrufen, Kategorien/Collections durchstöbern
- Source Control: Pull von Git (kein Push)
- Security Audit der n8n-Instanz

## Bewusst NICHT erlaubt
- Workflows aktivieren/deaktivieren (publishen)
- Workflows löschen
- Workflows manuell ausführen
- Credentials erstellen/löschen (Sicherheitsrisiko)
- Variables löschen
- Source Control Push (nur Pull erlaubt)

## Setup

### 1. Dependencies installieren

```bash
npm install
npm run build
```

### 2. n8n API-Key erstellen

In deiner n8n-Instanz: **Settings → API → Create API Key**

### 3. n8n URL finden

Öffne n8n im Browser. Die URL in der Adressleiste ist deine Base-URL (z.B. `https://dein-name.app.n8n.cloud`).
Bei Hostinger findest du die URL auch im Hostinger Dashboard unter deiner n8n-Installation.

### 4. In Claude Code konfigurieren

Füge folgendes in deine Claude Code MCP-Konfiguration ein (`~/.claude/settings.json` oder `.claude/settings.json` im Projekt):

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["<PFAD-ZU-DIESEM-PROJEKT>/dist/index.js"],
      "env": {
        "N8N_BASE_URL": "https://deine-n8n-url.com",
        "N8N_API_KEY": "dein-api-key"
      }
    }
  }
}
```

Ersetze:
- `<PFAD-ZU-DIESEM-PROJEKT>` mit dem absoluten Pfad zu diesem Ordner
- `https://deine-n8n-url.com` mit deiner n8n-URL
- `dein-api-key` mit deinem n8n API-Key

### 5. Claude Code neu starten

Nach dem Konfigurieren Claude Code neu starten. Danach stehen die n8n-Tools zur Verfügung.

## Verfügbare Tools

| Tool | Beschreibung |
|------|-------------|
| **Workflows** | |
| `list_workflows` | Alle Workflows auflisten |
| `get_workflow` | Workflow-Details inkl. Nodes und Connections |
| `search_workflows` | Workflows nach Name suchen (Substring-Match) |
| `create_workflow` | Neuen Workflow erstellen (immer inaktiv) |
| `update_workflow` | Bestehenden Workflow bearbeiten |
| `duplicate_workflow` | Bestehenden Workflow klonen (mit neuem Namen) |
| **Credentials** | |
| `list_credentials` | Verfügbare Credentials auflisten (sensible Daten geschwärzt) |
| `get_credential_schema` | Schema/Felder eines Credential-Typs abrufen |
| **Tags** | |
| `list_tags` | Tags auflisten |
| `create_tag` | Neuen Tag erstellen |
| `update_tag` | Tag umbenennen |
| **Variables** | |
| `list_variables` | Umgebungsvariablen auflisten ($vars in Workflows) |
| `create_variable` | Neue Variable erstellen |
| `update_variable` | Variable aktualisieren |
| **Executions** | |
| `list_executions` | Ausführungs-Historie ansehen |
| `get_execution` | Details einer Ausführung |
| `delete_execution` | Ausführung aus Historie löschen |
| **Templates** | |
| `search_templates` | Workflow-Vorlagen nach Stichwort suchen |
| `get_template` | Template-Details inkl. Nodes und Connections |
| `list_template_categories` | Template-Kategorien auflisten |
| `list_template_collections` | Kuratierte Template-Sammlungen |
| **Source Control** | |
| `source_control_pull` | Workflows von Git-Source-Control pullen |
| **Audit** | |
| `run_audit` | Sicherheits-Audit der n8n-Instanz |
