use axum::response::Json;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct SystemStats {
    pub cpu: CpuStats,
    pub memory: MemoryStats,
    pub swap: SwapStats,
    pub disk: Vec<DiskStats>,
    pub network: Vec<NetStats>,
    pub temps: Vec<TempSensor>,
    pub uptime: u64,
    pub load: [f64; 3],
    pub hostname: String,
    pub kernel: String,
    pub processes: usize,
}

#[derive(Serialize)]
pub struct CpuStats {
    pub cores: usize,
    pub model: String,
    pub usage_per_core: Vec<f64>,
    pub usage_total: f64,
    pub freq_mhz: f64,
}

#[derive(Serialize)]
pub struct MemoryStats {
    pub total_mb: u64,
    pub used_mb: u64,
    pub available_mb: u64,
    pub percent: f64,
}

#[derive(Serialize)]
pub struct SwapStats {
    pub total_mb: u64,
    pub used_mb: u64,
    pub percent: f64,
}

#[derive(Serialize)]
pub struct DiskStats {
    pub mount: String,
    pub device: String,
    pub fs_type: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub available_gb: f64,
    pub percent: f64,
}

#[derive(Serialize)]
pub struct NetStats {
    pub interface: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_packets: u64,
    pub tx_packets: u64,
}

#[derive(Serialize)]
pub struct TempSensor {
    pub label: String,
    pub temp_c: f64,
}

pub async fn get_stats() -> Json<SystemStats> {
    Json(SystemStats {
        cpu: read_cpu(),
        memory: read_memory(),
        swap: read_swap(),
        disk: read_disks(),
        network: read_network(),
        temps: read_temps(),
        uptime: read_uptime(),
        load: read_load(),
        hostname: read_file_trimmed("/etc/hostname"),
        kernel: read_proc_field("/proc/version", 2),
        processes: count_processes(),
    })
}

// ── CPU ──

fn read_cpu() -> CpuStats {
    let stat = read_file("/proc/stat");
    let cpuinfo = read_file("/proc/cpuinfo");

    let model = cpuinfo
        .lines()
        .find(|l| l.starts_with("model name"))
        .and_then(|l| l.split(':').nth(1))
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let cores = cpuinfo
        .lines()
        .filter(|l| l.starts_with("processor"))
        .count();

    let freq = cpuinfo
        .lines()
        .find(|l| l.starts_with("cpu MHz"))
        .and_then(|l| l.split(':').nth(1))
        .and_then(|s| s.trim().parse::<f64>().ok())
        .unwrap_or(0.0);

    // parse /proc/stat for total usage (snapshot — returns idle ratio)
    let total_usage = stat
        .lines()
        .next()
        .map(|line| {
            let vals: Vec<u64> = line
                .split_whitespace()
                .skip(1)
                .filter_map(|v| v.parse().ok())
                .collect();
            if vals.len() >= 4 {
                let total: u64 = vals.iter().sum();
                let idle = vals[3];
                if total > 0 {
                    ((total - idle) as f64 / total as f64) * 100.0
                } else {
                    0.0
                }
            } else {
                0.0
            }
        })
        .unwrap_or(0.0);

    // per-core usage
    let usage_per_core: Vec<f64> = stat
        .lines()
        .filter(|l| l.starts_with("cpu") && !l.starts_with("cpu "))
        .map(|line| {
            let vals: Vec<u64> = line
                .split_whitespace()
                .skip(1)
                .filter_map(|v| v.parse().ok())
                .collect();
            if vals.len() >= 4 {
                let total: u64 = vals.iter().sum();
                let idle = vals[3];
                if total > 0 {
                    ((total - idle) as f64 / total as f64) * 100.0
                } else {
                    0.0
                }
            } else {
                0.0
            }
        })
        .collect();

    CpuStats {
        cores,
        model,
        usage_per_core,
        usage_total: total_usage,
        freq_mhz: freq,
    }
}

// ── Memory ──

fn read_memory() -> MemoryStats {
    let meminfo = read_file("/proc/meminfo");
    let total = parse_meminfo_kb(&meminfo, "MemTotal");
    let available = parse_meminfo_kb(&meminfo, "MemAvailable");
    let used = total.saturating_sub(available);

    MemoryStats {
        total_mb: total / 1024,
        used_mb: used / 1024,
        available_mb: available / 1024,
        percent: if total > 0 {
            (used as f64 / total as f64) * 100.0
        } else {
            0.0
        },
    }
}

fn read_swap() -> SwapStats {
    let meminfo = read_file("/proc/meminfo");
    let total = parse_meminfo_kb(&meminfo, "SwapTotal");
    let free = parse_meminfo_kb(&meminfo, "SwapFree");
    let used = total.saturating_sub(free);

    SwapStats {
        total_mb: total / 1024,
        used_mb: used / 1024,
        percent: if total > 0 {
            (used as f64 / total as f64) * 100.0
        } else {
            0.0
        },
    }
}

fn parse_meminfo_kb(data: &str, key: &str) -> u64 {
    data.lines()
        .find(|l| l.starts_with(key))
        .and_then(|l| {
            l.split_whitespace()
                .nth(1)
                .and_then(|v| v.parse().ok())
        })
        .unwrap_or(0)
}

// ── Disks ──

fn read_disks() -> Vec<DiskStats> {
    let mounts = read_file("/proc/mounts");
    let mut results = Vec::new();

    for line in mounts.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }
        let device = parts[0];
        let mount = parts[1];
        let fs_type = parts[2];

        // skip virtual filesystems
        if !device.starts_with('/') {
            continue;
        }
        // skip snap mounts
        if mount.starts_with("/snap") {
            continue;
        }

        // use statvfs via libc-like approach: just read df output
        if let Some(stat) = statvfs_simple(mount) {
            results.push(DiskStats {
                mount: mount.to_string(),
                device: device.to_string(),
                fs_type: fs_type.to_string(),
                total_gb: stat.0,
                used_gb: stat.1,
                available_gb: stat.2,
                percent: if stat.0 > 0.0 {
                    (stat.1 / stat.0) * 100.0
                } else {
                    0.0
                },
            });
        }
    }

    results
}

fn statvfs_simple(mount: &str) -> Option<(f64, f64, f64)> {
    let output = std::process::Command::new("df")
        .args(["-B1", mount])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().nth(1)?;
    let vals: Vec<&str> = line.split_whitespace().collect();
    if vals.len() < 4 {
        return None;
    }
    let total: f64 = vals[1].parse().ok()?;
    let used: f64 = vals[2].parse().ok()?;
    let avail: f64 = vals[3].parse().ok()?;
    let gb = 1024.0 * 1024.0 * 1024.0;
    Some((total / gb, used / gb, avail / gb))
}

// ── Network ──

fn read_network() -> Vec<NetStats> {
    let data = read_file("/proc/net/dev");
    let mut results = Vec::new();

    for line in data.lines().skip(2) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 10 {
            continue;
        }
        let iface = parts[0].trim_end_matches(':');
        if iface == "lo" {
            continue;
        }

        results.push(NetStats {
            interface: iface.to_string(),
            rx_bytes: parts[1].parse().unwrap_or(0),
            tx_bytes: parts[9].parse().unwrap_or(0),
            rx_packets: parts[2].parse().unwrap_or(0),
            tx_packets: parts[10].parse().unwrap_or(0),
        });
    }

    results
}

// ── Temperatures ──

fn read_temps() -> Vec<TempSensor> {
    let mut sensors = Vec::new();
    let hwmon = Path::new("/sys/class/hwmon");

    if let Ok(entries) = std::fs::read_dir(hwmon) {
        for entry in entries.flatten() {
            let dir = entry.path();
            let name = read_file_trimmed(&dir.join("name").to_string_lossy());

            for i in 1..=16 {
                let temp_file = dir.join(format!("temp{i}_input"));
                let label_file = dir.join(format!("temp{i}_label"));

                if let Ok(temp_str) = std::fs::read_to_string(&temp_file) {
                    if let Ok(millideg) = temp_str.trim().parse::<f64>() {
                        let label = std::fs::read_to_string(&label_file)
                            .map(|s| s.trim().to_string())
                            .unwrap_or_else(|_| format!("{name} temp{i}"));

                        sensors.push(TempSensor {
                            label,
                            temp_c: millideg / 1000.0,
                        });
                    }
                }
            }
        }
    }

    sensors
}

// ── System info ──

fn read_uptime() -> u64 {
    read_file("/proc/uptime")
        .split_whitespace()
        .next()
        .and_then(|v| v.parse::<f64>().ok())
        .map(|v| v as u64)
        .unwrap_or(0)
}

fn read_load() -> [f64; 3] {
    let data = read_file("/proc/loadavg");
    let parts: Vec<f64> = data
        .split_whitespace()
        .take(3)
        .filter_map(|v| v.parse().ok())
        .collect();
    [
        parts.first().copied().unwrap_or(0.0),
        parts.get(1).copied().unwrap_or(0.0),
        parts.get(2).copied().unwrap_or(0.0),
    ]
}

fn count_processes() -> usize {
    std::fs::read_dir("/proc")
        .map(|entries| {
            entries
                .flatten()
                .filter(|e| {
                    e.file_name()
                        .to_str()
                        .map(|s| s.chars().all(|c| c.is_ascii_digit()))
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0)
}

// ── Helpers ──

fn read_file(path: &str) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

fn read_file_trimmed(path: &str) -> String {
    std::fs::read_to_string(path)
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn read_proc_field(path: &str, index: usize) -> String {
    read_file(path)
        .split_whitespace()
        .nth(index)
        .unwrap_or("")
        .to_string()
}
