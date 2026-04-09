use axum::response::Json;
use serde_json::json;

pub async fn list_frontend_apps() -> Json<serde_json::Value> {
    let mut apps = vec![];
    let apps_dir = std::path::Path::new("frontend/apps");
    if let Ok(entries) = std::fs::read_dir(apps_dir) {
        for entry in entries.flatten() {
            if !entry.path().is_dir() {
                continue;
            }
            let manifest_path = entry.path().join("manifest.json");
            if manifest_path.exists() {
                if let Ok(contents) = std::fs::read_to_string(&manifest_path) {
                    if let Ok(manifest) = serde_json::from_str::<serde_json::Value>(&contents) {
                        apps.push(manifest);
                    }
                }
            }
        }
    }
    // sort by id for consistent order
    apps.sort_by(|a, b| {
        let a_id = a.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let b_id = b.get("id").and_then(|v| v.as_str()).unwrap_or("");
        a_id.cmp(b_id)
    });
    Json(json!({ "apps": apps }))
}
