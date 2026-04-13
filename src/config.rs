use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlabConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    #[serde(default)]
    pub performance: PerformanceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralConfig {
    #[serde(default = "default_theme")]
    pub theme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceConfig {
    #[serde(default = "default_true")]
    pub animations: bool,
}

fn default_theme() -> String { "dark".into() }
fn default_true() -> bool { true }

impl Default for GeneralConfig {
    fn default() -> Self { Self { theme: default_theme() } }
}

impl Default for PerformanceConfig {
    fn default() -> Self { Self { animations: true } }
}

impl Default for SlabConfig {
    fn default() -> Self {
        Self {
            general: GeneralConfig::default(),
            performance: PerformanceConfig::default(),
        }
    }
}

impl SlabConfig {
    pub fn load() -> Self {
        let path = config_path();
        if path.exists() {
            if let Ok(content) = std::fs::read_to_string(&path) {
                if let Ok(cfg) = serde_json::from_str(&content) {
                    return cfg;
                }
            }
        }
        Self::default()
    }

    pub fn save(&self) {
        let path = config_path();
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(self) {
            let _ = std::fs::write(path, json);
        }
    }

    pub fn is_dark(&self) -> bool {
        self.general.theme != "light"
    }
}

fn config_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home/user".into());
    PathBuf::from(home).join(".config/slab/config.json")
}
