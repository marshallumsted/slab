use axum::response::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct SetupStatus {
    pub distro: String,
    pub pkg_manager: String,
    pub items: Vec<SetupItem>,
}

#[derive(Serialize)]
pub struct SetupItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub installed: bool,
    pub version: String,
    pub required: bool,
    pub install_cmd: String,
}

pub async fn get_status() -> Json<SetupStatus> {
    let (distro, pkg_manager) = detect_distro();

    let items = vec![
        check_tool(
            "xpra",
            "Xpra",
            "Stream native GUI apps into slab windows (X Bridge)",
            false,
            &pkg_manager,
            &[("pacman", "sudo pacman -S xpra"), ("apt", "sudo apt install xpra"), ("dnf", "sudo dnf install xpra"), ("zypper", "sudo zypper install xpra")],
        ),
        check_tool(
            "ffmpeg",
            "FFmpeg",
            "Video thumbnails in file browser and media viewer",
            false,
            &pkg_manager,
            &[("pacman", "sudo pacman -S ffmpeg"), ("apt", "sudo apt install ffmpeg"), ("dnf", "sudo dnf install ffmpeg"), ("zypper", "sudo zypper install ffmpeg")],
        ),
        check_tool(
            "fish",
            "Fish Shell",
            "Friendly interactive shell (optional terminal default)",
            false,
            &pkg_manager,
            &[("pacman", "sudo pacman -S fish"), ("apt", "sudo apt install fish"), ("dnf", "sudo dnf install fish"), ("zypper", "sudo zypper install fish")],
        ),
        check_tool(
            "btop",
            "btop",
            "Resource monitor — runs inside slab terminal",
            false,
            &pkg_manager,
            &[("pacman", "sudo pacman -S btop"), ("apt", "sudo apt install btop"), ("dnf", "sudo dnf install btop"), ("zypper", "sudo zypper install btop")],
        ),
        check_tool(
            "docker",
            "Docker",
            "Container management (planned feature)",
            false,
            &pkg_manager,
            &[("pacman", "sudo pacman -S docker"), ("apt", "sudo apt install docker.io"), ("dnf", "sudo dnf install docker"), ("zypper", "sudo zypper install docker")],
        ),
        check_tool(
            "podman",
            "Podman",
            "Rootless container runtime (Docker alternative)",
            false,
            &pkg_manager,
            &[("pacman", "sudo pacman -S podman"), ("apt", "sudo apt install podman"), ("dnf", "sudo dnf install podman"), ("zypper", "sudo zypper install podman")],
        ),
        check_systemd(),
        check_dir("/etc/slab", "System Config", "System-wide slab config directory (/etc/slab)", "sudo mkdir -p /etc/slab"),
    ];

    Json(SetupStatus {
        distro,
        pkg_manager,
        items,
    })
}

fn detect_distro() -> (String, String) {
    // read /etc/os-release
    let os_release = std::fs::read_to_string("/etc/os-release").unwrap_or_default();
    let name = os_release
        .lines()
        .find(|l| l.starts_with("PRETTY_NAME="))
        .map(|l| l.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string())
        .unwrap_or_else(|| "Unknown".into());

    let pkg = if which("pacman") {
        "pacman"
    } else if which("apt") {
        "apt"
    } else if which("dnf") {
        "dnf"
    } else if which("zypper") {
        "zypper"
    } else {
        "unknown"
    };

    (name, pkg.to_string())
}

fn which(cmd: &str) -> bool {
    std::process::Command::new("which")
        .arg(cmd)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn get_version(cmd: &str) -> String {
    std::process::Command::new(cmd)
        .arg("--version")
        .output()
        .ok()
        .map(|o| {
            let out = String::from_utf8_lossy(&o.stdout);
            let err = String::from_utf8_lossy(&o.stderr);
            let text = if out.trim().is_empty() { err } else { out };
            text.lines().next().unwrap_or("").trim().to_string()
        })
        .unwrap_or_default()
}

fn check_tool(cmd: &str, name: &str, desc: &str, required: bool, pkg_mgr: &str, cmds: &[(&str, &str)]) -> SetupItem {
    let installed = which(cmd);
    let version = if installed { get_version(cmd) } else { String::new() };
    let install_cmd = cmds
        .iter()
        .find(|(pm, _)| *pm == pkg_mgr)
        .map(|(_, c)| c.to_string())
        .unwrap_or_else(|| format!("# install {cmd} using your package manager"));

    SetupItem {
        id: cmd.to_string(),
        name: name.to_string(),
        description: desc.to_string(),
        installed,
        version,
        required,
        install_cmd,
    }
}

fn check_systemd() -> SetupItem {
    let installed = std::path::Path::new("/run/systemd/system").exists();
    SetupItem {
        id: "systemd".into(),
        name: "systemd".into(),
        description: "Init system — required for service manager and log viewer".into(),
        installed,
        version: if installed {
            get_version("systemctl")
        } else {
            String::new()
        },
        required: true,
        install_cmd: "# systemd is the init system — cannot be installed separately".into(),
    }
}

fn check_dir(path: &str, name: &str, desc: &str, cmd: &str) -> SetupItem {
    let exists = std::path::Path::new(path).exists();
    SetupItem {
        id: path.to_string(),
        name: name.to_string(),
        description: desc.to_string(),
        installed: exists,
        version: String::new(),
        required: false,
        install_cmd: cmd.to_string(),
    }
}
