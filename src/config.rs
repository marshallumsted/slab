use axum::{response::Json, http::StatusCode};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone)]
pub struct SlabConfig {
    pub places: Vec<Place>,
    pub network: Vec<NetworkPlace>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Place {
    pub name: String,
    pub path: String,
    pub builtin: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct NetworkPlace {
    pub id: String,
    pub name: String,
    pub protocol: String, // smb, ftp, sftp, nfs, webdav
    pub host: String,
    pub port: Option<u16>,
    pub path: String,
    pub username: Option<String>,
    pub pinned: bool,
}

fn config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
    PathBuf::from(home).join(".config/slab/config.json")
}

fn default_config() -> SlabConfig {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".into());
    SlabConfig {
        places: vec![
            Place { name: "Home".into(), path: home.clone(), builtin: true },
            Place { name: "Desktop".into(), path: format!("{home}/Desktop"), builtin: true },
            Place { name: "Documents".into(), path: format!("{home}/Documents"), builtin: true },
            Place { name: "Downloads".into(), path: format!("{home}/Downloads"), builtin: true },
            Place { name: "Pictures".into(), path: format!("{home}/Pictures"), builtin: true },
            Place { name: "Music".into(), path: format!("{home}/Music"), builtin: true },
            Place { name: "Videos".into(), path: format!("{home}/Videos"), builtin: true },
        ],
        network: vec![],
    }
}

pub fn load_config() -> SlabConfig {
    let path = config_path();
    if path.exists() {
        match std::fs::read_to_string(&path) {
            Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| default_config()),
            Err(_) => default_config(),
        }
    } else {
        default_config()
    }
}

fn save_config(config: &SlabConfig) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

pub async fn get_config() -> Json<SlabConfig> {
    Json(load_config())
}

pub async fn set_config(Json(config): Json<SlabConfig>) -> StatusCode {
    match save_config(&config) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
