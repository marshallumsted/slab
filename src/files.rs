use axum::{extract::Query, response::Json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct ListParams {
    path: Option<String>,
}

#[derive(Serialize)]
pub struct DirEntry {
    name: String,
    is_dir: bool,
    size: u64,
    modified: u64,
}

#[derive(Serialize)]
pub struct DirListing {
    path: String,
    parent: Option<String>,
    entries: Vec<DirEntry>,
}

pub async fn list_dir(Query(params): Query<ListParams>) -> Json<DirListing> {
    let path = params
        .path
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/"));

    // resolve to canonical, fall back to /
    let path = path.canonicalize().unwrap_or_else(|_| PathBuf::from("/"));

    let parent = path.parent().map(|p| p.to_string_lossy().into_owned());

    let mut entries = Vec::new();

    if let Ok(read_dir) = std::fs::read_dir(&path) {
        for entry in read_dir.flatten() {
            let meta = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            entries.push(DirEntry {
                name: entry.file_name().to_string_lossy().into_owned(),
                is_dir: meta.is_dir(),
                size: meta.len(),
                modified,
            });
        }
    }

    // dirs first, then alphabetical
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));

    Json(DirListing {
        path: path.to_string_lossy().into_owned(),
        parent,
        entries,
    })
}
