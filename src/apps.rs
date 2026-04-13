use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppManifest {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub bin: String,
    #[serde(default)]
    pub tile: Option<TileConfig>,
    #[serde(default)]
    pub settings: Vec<SettingDef>,
    #[serde(default)]
    pub spawn: Vec<SpawnEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileConfig {
    #[serde(default = "default_color")]
    pub color: String,
    #[serde(default = "default_size")]
    pub size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingDef {
    pub key: String,
    pub name: String,
    #[serde(rename = "type")]
    pub setting_type: String,
    #[serde(default)]
    pub default: serde_json::Value,
    #[serde(default)]
    pub options: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnEntry {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub icon: String,
}

fn default_color() -> String { "gray".into() }
fn default_size() -> String { "normal".into() }

/// Scan for installed slab app manifests
pub fn scan_apps() -> Vec<AppManifest> {
    let mut manifests = Vec::new();

    let search_paths = [
        // user-installed apps
        home_dir().join(".local/share/slab/apps"),
        // system-installed apps
        PathBuf::from("/usr/share/slab/apps"),
        PathBuf::from("/usr/local/share/slab/apps"),
    ];

    for base in &search_paths {
        if let Ok(entries) = std::fs::read_dir(base) {
            for entry in entries.flatten() {
                if !entry.path().is_dir() {
                    continue;
                }
                let manifest_path = entry.path().join("manifest.json");
                if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                    if let Ok(manifest) = serde_json::from_str::<AppManifest>(&content) {
                        manifests.push(manifest);
                    }
                }
            }
        }
    }

    manifests.sort_by(|a, b| a.name.cmp(&b.name));
    manifests
}

/// A system GUI app discovered from .desktop files
#[derive(Debug, Clone)]
pub struct DesktopApp {
    pub id: String,
    pub name: String,
    pub exec: String,
    pub icon: String,
    pub category: String,
    pub comment: String,
}

/// Scan for installed GUI applications via .desktop files
pub fn scan_desktop_apps() -> Vec<DesktopApp> {
    let mut apps = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let dirs = [
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
        home_dir().join(".local/share/applications"),
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
    ];

    for dir in &dirs {
        let Ok(entries) = std::fs::read_dir(dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("desktop") {
                continue;
            }
            let id = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            if seen.contains(&id) { continue; }
            if let Some(app) = parse_desktop_file(&path, &id) {
                seen.insert(id);
                apps.push(app);
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

fn parse_desktop_file(path: &PathBuf, id: &str) -> Option<DesktopApp> {
    let content = std::fs::read_to_string(path).ok()?;
    let mut in_entry = false;
    let mut fields = std::collections::HashMap::new();

    for line in content.lines() {
        let line = line.trim();
        if line == "[Desktop Entry]" { in_entry = true; continue; }
        if line.starts_with('[') { if in_entry { break; } continue; }
        if !in_entry { continue; }
        if let Some((key, val)) = line.split_once('=') {
            if key.contains('[') { continue; } // skip localized
            fields.insert(key.trim().to_string(), val.trim().to_string());
        }
    }

    if fields.get("Type").map(|s| s.as_str()) != Some("Application") { return None; }
    if fields.get("NoDisplay").map(|v| v == "true").unwrap_or(false) { return None; }
    if fields.get("Hidden").map(|v| v == "true").unwrap_or(false) { return None; }

    let name = fields.get("Name")?.clone();
    let exec = fields.get("Exec").cloned().unwrap_or_default();
    // strip field codes (%u, %U, %f, %F, etc.)
    let exec = exec.split_whitespace()
        .filter(|s| !s.starts_with('%'))
        .collect::<Vec<_>>()
        .join(" ");
    let icon = fields.get("Icon").cloned().unwrap_or_default();
    let comment = fields.get("Comment").cloned().unwrap_or_default();

    let raw_cats: Vec<String> = fields.get("Categories")
        .map(|c| c.split(';').filter(|s| !s.is_empty()).map(|s| s.to_string()).collect())
        .unwrap_or_default();
    let category = raw_cats.first().map(|c| normalize_category(c)).unwrap_or_else(|| "Other".into());

    Some(DesktopApp { id: id.to_string(), name, exec, icon, category, comment })
}

fn normalize_category(cat: &str) -> String {
    match cat {
        "AudioVideo" | "Audio" | "Video" | "Player" | "Recorder" => "Media",
        "Development" | "IDE" | "TextEditor" | "WebDevelopment" => "Development",
        "Game" | "ActionGame" | "ArcadeGame" | "BoardGame" | "CardGame" | "LogicGame"
        | "RolePlaying" | "Simulation" | "SportsGame" | "StrategyGame" => "Games",
        "Graphics" | "2DGraphics" | "3DGraphics" | "Photography" | "Viewer" => "Graphics",
        "Network" | "WebBrowser" | "Email" | "Chat" | "InstantMessaging" => "Internet",
        "Office" | "WordProcessor" | "Spreadsheet" | "Presentation" | "Calendar" => "Office",
        "Settings" | "DesktopSettings" | "HardwareSettings" | "PackageManager" => "Settings",
        "System" | "FileManager" | "TerminalEmulator" | "Monitor" => "System",
        "Utility" | "Accessibility" | "Archiving" | "Calculator" | "Clock" => "Utilities",
        "Education" | "Science" | "Math" | "Languages" => "Education",
        _ => cat,
    }.to_string()
}

fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/home/user"))
}
