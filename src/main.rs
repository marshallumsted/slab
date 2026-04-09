use axum::{Router, response::Json, routing::{get, post}};
use serde_json::json;
use tower_http::services::ServeDir;

mod config;
mod files;
mod media;
mod sysmon;
mod terminal;

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("SLAB_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let api = Router::new()
        .route("/api/files", get(files::list_dir))
        .route("/api/raw", get(files::serve_raw))
        .route("/api/thumbnail", get(files::thumbnail))
        .route("/api/download", get(files::download))
        .route("/api/files/rename", post(files::rename))
        .route("/api/files/copy", post(files::copy))
        .route("/api/files/move", post(files::move_files))
        .route("/api/files/delete", post(files::delete))
        .route("/api/files/mkdir", post(files::mkdir))
        .route("/api/files/read", get(files::read_text))
        .route("/api/files/write", post(files::write_text))
        .route("/api/files/touch", post(files::touch))
        .route("/api/user", get(get_user))
        .route("/api/config", get(config::get_config).post(config::set_config))
        .route("/api/config/system", post(config::set_system_config))
        .route("/api/media/scan", get(media::scan_folders))
        .route("/api/media/list", get(media::list_media))
        .route("/api/sysmon", get(sysmon::get_stats))
        .route("/api/terminal", get(terminal::ws_handler));

    let app = api.fallback_service(ServeDir::new("frontend"));

    let addr = format!("0.0.0.0:{port}");
    println!("[S] slab running on http://{addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn get_user() -> Json<serde_json::Value> {
    let user = std::env::var("USER")
        .or_else(|_| std::env::var("LOGNAME"))
        .unwrap_or_else(|_| "user".into());
    let home = std::env::var("HOME").unwrap_or_else(|_| format!("/home/{user}"));
    let hostname = std::fs::read_to_string("/etc/hostname")
        .unwrap_or_default()
        .trim()
        .to_string();
    Json(json!({ "user": user, "home": home, "hostname": hostname }))
}
