use axum::{extract::Query, response::Json};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif"];
const VIDEO_EXTS: &[&str] = &["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "mpg", "mpeg", "ts"];

fn is_media(name: &str) -> bool {
    let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
    IMAGE_EXTS.contains(&ext.as_str()) || VIDEO_EXTS.contains(&ext.as_str())
}

fn is_image(name: &str) -> bool {
    let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
    IMAGE_EXTS.contains(&ext.as_str())
}

fn is_video(name: &str) -> bool {
    let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
    VIDEO_EXTS.contains(&ext.as_str())
}

// scan a directory tree for folders containing media files
#[derive(Serialize)]
pub struct MediaFolder {
    path: String,
    name: String,
    image_count: usize,
    video_count: usize,
}

#[derive(Serialize)]
pub struct ScanResult {
    folders: Vec<MediaFolder>,
}

#[derive(Deserialize)]
pub struct ScanParams {
    root: Option<String>,
    depth: Option<usize>,
}

pub async fn scan_folders(Query(params): Query<ScanParams>) -> Json<ScanResult> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/home".into());
    let root = PathBuf::from(params.root.unwrap_or(home));
    let max_depth = params.depth.unwrap_or(4);

    let mut folders = Vec::new();
    scan_recursive(&root, 0, max_depth, &mut folders);

    // sort alphabetically by name
    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Json(ScanResult { folders })
}

fn scan_recursive(dir: &std::path::Path, depth: usize, max_depth: usize, results: &mut Vec<MediaFolder>) {
    if depth > max_depth { return; }

    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    let mut images = 0usize;
    let mut videos = 0usize;
    let mut subdirs = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();

        // skip hidden
        if name.starts_with('.') { continue; }

        if let Ok(ft) = entry.file_type() {
            if ft.is_dir() {
                subdirs.push(entry.path());
            } else if ft.is_file() {
                if is_image(&name) { images += 1; }
                else if is_video(&name) { videos += 1; }
            }
        }
    }

    if images > 0 || videos > 0 {
        results.push(MediaFolder {
            path: dir.to_string_lossy().into_owned(),
            name: dir.file_name().unwrap_or_default().to_string_lossy().into_owned(),
            image_count: images,
            video_count: videos,
        });
    }

    for sub in subdirs {
        scan_recursive(&sub, depth + 1, max_depth, results);
    }
}

// list media files in a specific folder
#[derive(Deserialize)]
pub struct ListParams {
    path: String,
}

#[derive(Serialize)]
pub struct MediaFile {
    name: String,
    path: String,
    is_video: bool,
    size: u64,
}

#[derive(Serialize)]
pub struct MediaList {
    folder: String,
    files: Vec<MediaFile>,
}

pub async fn list_media(Query(params): Query<ListParams>) -> Json<MediaList> {
    let dir = PathBuf::from(&params.path);
    let mut files = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if !is_media(&name) { continue; }

            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
            let full_path = entry.path().to_string_lossy().into_owned();

            files.push(MediaFile {
                name: name.clone(),
                path: full_path,
                is_video: is_video(&name),
                size,
            });
        }
    }

    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Json(MediaList {
        folder: dir.to_string_lossy().into_owned(),
        files,
    })
}
