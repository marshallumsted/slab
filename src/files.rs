use axum::{
    extract::Query,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Json},
};
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

#[derive(Deserialize)]
pub struct RawParams {
    path: String,
}

pub async fn serve_raw(Query(params): Query<RawParams>) -> impl IntoResponse {
    let path = PathBuf::from(&params.path);
    let path = match path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::NOT_FOUND, HeaderMap::new(), Vec::new()),
    };

    let bytes = match std::fs::read(&path) {
        Ok(b) => b,
        Err(_) => return (StatusCode::NOT_FOUND, HeaderMap::new(), Vec::new()),
    };

    let mime = match path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("avif") => "image/avif",
        Some("pdf") => "application/pdf",
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mkv") => "video/x-matroska",
        Some("avi") => "video/x-msvideo",
        Some("mov") => "video/quicktime",
        _ => "application/octet-stream",
    };

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, mime.parse().unwrap());
    headers.insert(header::CACHE_CONTROL, "public, max-age=60".parse().unwrap());

    (StatusCode::OK, headers, bytes)
}

// video thumbnail via ffmpeg, cached
pub async fn thumbnail(Query(params): Query<RawParams>) -> impl IntoResponse {
    let path = PathBuf::from(&params.path);
    let path = match path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::NOT_FOUND, HeaderMap::new(), Vec::new()),
    };

    // cache dir
    let cache_dir = PathBuf::from(
        std::env::var("HOME").unwrap_or_else(|_| "/tmp".into()),
    )
    .join(".cache/slab/thumbs");
    let _ = std::fs::create_dir_all(&cache_dir);

    // cache key from path + modified time
    let modified = std::fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let hash = format!("{:x}", {
        let s = format!("{}:{}", path.display(), modified);
        s.bytes().fold(0u64, |h, b| h.wrapping_mul(31).wrapping_add(b as u64))
    });
    let thumb_path = cache_dir.join(format!("{hash}.jpg"));

    // serve from cache if exists
    if thumb_path.exists() {
        if let Ok(bytes) = std::fs::read(&thumb_path) {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/jpeg".parse().unwrap());
            headers.insert(header::CACHE_CONTROL, "public, max-age=3600".parse().unwrap());
            return (StatusCode::OK, headers, bytes);
        }
    }

    // generate with ffmpeg: grab frame at 1s, scale to 200px wide
    let output = std::process::Command::new("ffmpeg")
        .args([
            "-y",
            "-i", &path.to_string_lossy(),
            "-ss", "1",
            "-vframes", "1",
            "-vf", "scale=200:-1",
            "-q:v", "6",
            &thumb_path.to_string_lossy(),
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    if output.is_err() || !thumb_path.exists() {
        return (StatusCode::INTERNAL_SERVER_ERROR, HeaderMap::new(), Vec::new());
    }

    match std::fs::read(&thumb_path) {
        Ok(bytes) => {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "image/jpeg".parse().unwrap());
            headers.insert(header::CACHE_CONTROL, "public, max-age=3600".parse().unwrap());
            (StatusCode::OK, headers, bytes)
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, HeaderMap::new(), Vec::new()),
    }
}

// file download with Content-Disposition
pub async fn download(Query(params): Query<RawParams>) -> impl IntoResponse {
    let path = PathBuf::from(&params.path);
    let path = match path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::NOT_FOUND, HeaderMap::new(), Vec::new()),
    };

    let filename = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let bytes = match std::fs::read(&path) {
        Ok(b) => b,
        Err(_) => return (StatusCode::NOT_FOUND, HeaderMap::new(), Vec::new()),
    };

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "application/octet-stream".parse().unwrap());
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"{filename}\"").parse().unwrap(),
    );

    (StatusCode::OK, headers, bytes)
}

// read file as text
pub async fn read_text(Query(params): Query<RawParams>) -> impl IntoResponse {
    let path = PathBuf::from(&params.path);
    let path = match path.canonicalize() {
        Ok(p) => p,
        Err(_) => return (StatusCode::NOT_FOUND, HeaderMap::new(), String::new()),
    };
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            let mut headers = HeaderMap::new();
            headers.insert(header::CONTENT_TYPE, "text/plain; charset=utf-8".parse().unwrap());
            (StatusCode::OK, headers, content)
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, HeaderMap::new(), String::new()),
    }
}

// write file text
#[derive(Deserialize)]
pub struct WriteBody {
    pub path: String,
    pub content: String,
}

pub async fn write_text(Json(body): Json<WriteBody>) -> StatusCode {
    match std::fs::write(&body.path, &body.content) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

// ── File operations ──

#[derive(Deserialize)]
pub struct RenameBody {
    pub path: String,
    pub new_name: String,
}

pub async fn rename(Json(body): Json<RenameBody>) -> StatusCode {
    let src = PathBuf::from(&body.path);
    let dest = match src.parent() {
        Some(p) => p.join(&body.new_name),
        None => return StatusCode::BAD_REQUEST,
    };
    match std::fs::rename(&src, &dest) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

#[derive(Deserialize)]
pub struct CopyMoveBody {
    pub src: Vec<String>,
    pub dest: String,
}

pub async fn copy(Json(body): Json<CopyMoveBody>) -> StatusCode {
    let dest_dir = PathBuf::from(&body.dest);
    for src_path in &body.src {
        let src = PathBuf::from(src_path);
        let name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };
        let target = dest_dir.join(name);
        if src.is_dir() {
            if copy_dir_recursive(&src, &target).is_err() {
                return StatusCode::INTERNAL_SERVER_ERROR;
            }
        } else if std::fs::copy(&src, &target).is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }
    StatusCode::OK
}

fn copy_dir_recursive(src: &std::path::Path, dest: &std::path::Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dest)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let target = dest.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            std::fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}

pub async fn move_files(Json(body): Json<CopyMoveBody>) -> StatusCode {
    let dest_dir = PathBuf::from(&body.dest);
    for src_path in &body.src {
        let src = PathBuf::from(src_path);
        let name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };
        let target = dest_dir.join(name);
        if std::fs::rename(&src, &target).is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }
    StatusCode::OK
}

#[derive(Deserialize)]
pub struct DeleteBody {
    pub paths: Vec<String>,
}

pub async fn delete(Json(body): Json<DeleteBody>) -> StatusCode {
    for p in &body.paths {
        let path = PathBuf::from(p);
        let res = if path.is_dir() {
            std::fs::remove_dir_all(&path)
        } else {
            std::fs::remove_file(&path)
        };
        if res.is_err() {
            return StatusCode::INTERNAL_SERVER_ERROR;
        }
    }
    StatusCode::OK
}

#[derive(Deserialize)]
pub struct CreateBody {
    pub path: String,
}

pub async fn mkdir(Json(body): Json<CreateBody>) -> StatusCode {
    match std::fs::create_dir_all(&body.path) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

pub async fn touch(Json(body): Json<CreateBody>) -> StatusCode {
    match std::fs::File::create(&body.path) {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
