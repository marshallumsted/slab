use axum::{Router, response::Json, routing::get};
use serde_json::json;
use tower_http::services::ServeDir;

mod files;

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("SLAB_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    let api = Router::new()
        .route("/api/files", get(files::list_dir))
        .route("/api/user", get(get_user));

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
    Json(json!({ "user": user, "home": home }))
}
