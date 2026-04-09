use axum::{
    extract::Query,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct DesktopApp {
    pub id: String,
    pub name: String,
    pub exec: String,
    pub icon: String,
    pub categories: Vec<String>,
    pub comment: String,
    pub terminal: bool,
    pub no_display: bool,
}

#[derive(Serialize)]
pub struct AppList {
    pub apps: Vec<DesktopApp>,
    pub categories: Vec<String>,
}

pub async fn list_apps() -> Json<AppList> {
    let mut apps = Vec::new();
    let mut seen = std::collections::HashSet::new();

    let dirs = [
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
        dirs::home_dir()
            .unwrap_or_default()
            .join(".local/share/applications"),
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
    ];

    for dir in &dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("desktop") {
                    continue;
                }
                let id = path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                if seen.contains(&id) {
                    continue;
                }
                if let Some(app) = parse_desktop_file(&path, &id) {
                    if !app.no_display {
                        seen.insert(id);
                        apps.push(app);
                    }
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    // collect unique categories
    let mut cat_set = std::collections::HashSet::new();
    for app in &apps {
        for cat in &app.categories {
            cat_set.insert(cat.clone());
        }
    }
    let mut categories: Vec<String> = cat_set.into_iter().collect();
    categories.sort();

    Json(AppList { apps, categories })
}

fn parse_desktop_file(path: &Path, id: &str) -> Option<DesktopApp> {
    let content = std::fs::read_to_string(path).ok()?;
    let mut in_entry = false;
    let mut fields: HashMap<String, String> = HashMap::new();

    for line in content.lines() {
        let line = line.trim();
        if line == "[Desktop Entry]" {
            in_entry = true;
            continue;
        }
        if line.starts_with('[') {
            if in_entry {
                break;
            }
            continue;
        }
        if !in_entry {
            continue;
        }
        if let Some((key, val)) = line.split_once('=') {
            // skip localized keys
            if key.contains('[') {
                continue;
            }
            fields.insert(key.trim().to_string(), val.trim().to_string());
        }
    }

    let app_type = fields.get("Type").map(|s| s.as_str()).unwrap_or("");
    if app_type != "Application" {
        return None;
    }

    let name = fields.get("Name")?.clone();
    let exec = fields.get("Exec").cloned().unwrap_or_default();
    let icon = fields.get("Icon").cloned().unwrap_or_default();
    let comment = fields.get("Comment").cloned().unwrap_or_default();
    let terminal = fields.get("Terminal").map(|v| v == "true").unwrap_or(false);
    let no_display = fields.get("NoDisplay").map(|v| v == "true").unwrap_or(false)
        || fields.get("Hidden").map(|v| v == "true").unwrap_or(false);

    let categories: Vec<String> = fields
        .get("Categories")
        .map(|c| {
            c.split(';')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .map(|s| normalize_category(&s))
                .collect()
        })
        .unwrap_or_default();

    Some(DesktopApp {
        id: id.to_string(),
        name,
        exec,
        icon,
        categories: if categories.is_empty() {
            vec!["Other".to_string()]
        } else {
            categories
        },
        comment,
        terminal,
        no_display,
    })
}

fn normalize_category(cat: &str) -> String {
    match cat {
        "AudioVideo" | "Audio" | "Video" | "Player" | "Recorder" => "Media".to_string(),
        "Development" | "IDE" | "TextEditor" | "WebDevelopment" | "Building" | "Debugger" => {
            "Development".to_string()
        }
        "Game" | "ActionGame" | "AdventureGame" | "ArcadeGame" | "BoardGame" | "BlocksGame"
        | "CardGame" | "LogicGame" | "RolePlaying" | "Simulation" | "SportsGame"
        | "StrategyGame" => "Games".to_string(),
        "Graphics" | "2DGraphics" | "3DGraphics" | "VectorGraphics" | "RasterGraphics"
        | "Photography" | "Scanning" | "Viewer" => "Graphics".to_string(),
        "Network" | "WebBrowser" | "Email" | "Chat" | "InstantMessaging" | "IRCClient"
        | "FileTransfer" | "P2P" | "RemoteAccess" => "Internet".to_string(),
        "Office" | "WordProcessor" | "Spreadsheet" | "Presentation" | "Calendar" | "Finance" => {
            "Office".to_string()
        }
        "Settings" | "DesktopSettings" | "HardwareSettings" | "Preferences"
        | "PackageManager" => "Settings".to_string(),
        "System" | "FileManager" | "TerminalEmulator" | "Monitor" | "Security" | "Core" => {
            "System".to_string()
        }
        "Utility" | "Accessibility" | "Archiving" | "Compression" | "Calculator" | "Clock"
        | "TextTool" => "Utilities".to_string(),
        "Education" | "Science" | "Math" | "Geography" | "Languages" => "Education".to_string(),
        _ => {
            if cat.len() > 1 {
                cat.to_string()
            } else {
                "Other".to_string()
            }
        }
    }
}

// launch a system app
#[derive(Deserialize)]
pub struct LaunchBody {
    pub exec: String,
}

pub async fn launch_app(Json(body): Json<LaunchBody>) -> StatusCode {
    // strip desktop entry field codes (%u, %U, %f, %F, etc.)
    let cmd = body
        .exec
        .split_whitespace()
        .filter(|s| !s.starts_with('%'))
        .collect::<Vec<_>>()
        .join(" ");

    match std::process::Command::new("sh")
        .arg("-c")
        .arg(&cmd)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

// serve app icon
#[derive(Deserialize)]
pub struct IconParams {
    pub name: String,
    pub size: Option<u16>,
}

pub async fn serve_icon(Query(params): Query<IconParams>) -> impl IntoResponse {
    let name = &params.name;
    let size = params.size.unwrap_or(48);

    // if it's an absolute path, serve directly
    if name.starts_with('/') {
        if let Ok(bytes) = std::fs::read(name) {
            let mime = if name.ends_with(".svg") {
                "image/svg+xml"
            } else {
                "image/png"
            };
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, mime.parse().unwrap());
            headers.insert(
                header::CACHE_CONTROL,
                "public, max-age=3600".parse().unwrap(),
            );
            return (StatusCode::OK, headers, bytes);
        }
    }

    // search common icon locations
    let search_paths = [
        // hicolor theme (most common)
        format!("/usr/share/icons/hicolor/{size}x{size}/apps/{name}.png"),
        format!("/usr/share/icons/hicolor/{size}x{size}/apps/{name}.svg"),
        format!("/usr/share/icons/hicolor/scalable/apps/{name}.svg"),
        format!("/usr/share/icons/hicolor/256x256/apps/{name}.png"),
        format!("/usr/share/icons/hicolor/128x128/apps/{name}.png"),
        format!("/usr/share/icons/hicolor/64x64/apps/{name}.png"),
        format!("/usr/share/icons/hicolor/48x48/apps/{name}.png"),
        format!("/usr/share/icons/hicolor/32x32/apps/{name}.png"),
        // breeze (KDE)
        format!("/usr/share/icons/breeze/apps/{size}/{name}.svg"),
        format!("/usr/share/icons/breeze/apps/48/{name}.svg"),
        // pixmaps fallback
        format!("/usr/share/pixmaps/{name}.png"),
        format!("/usr/share/pixmaps/{name}.svg"),
        format!("/usr/share/pixmaps/{name}.xpm"),
        // flatpak
        format!("/var/lib/flatpak/exports/share/icons/hicolor/{size}x{size}/apps/{name}.png"),
        format!("/var/lib/flatpak/exports/share/icons/hicolor/scalable/apps/{name}.svg"),
    ];

    for path in &search_paths {
        if let Ok(bytes) = std::fs::read(path) {
            let mime = if path.ends_with(".svg") {
                "image/svg+xml"
            } else {
                "image/png"
            };
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, mime.parse().unwrap());
            headers.insert(
                header::CACHE_CONTROL,
                "public, max-age=3600".parse().unwrap(),
            );
            return (StatusCode::OK, headers, bytes);
        }
    }

    (StatusCode::NOT_FOUND, HeaderMap::new(), Vec::new())
}

mod dirs {
    use std::path::PathBuf;
    pub fn home_dir() -> Option<PathBuf> {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}
