use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use std::os::fd::FromRawFd;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

pub async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_terminal)
}

async fn handle_terminal(socket: WebSocket) {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into());

    // open PTY
    let mut master_fd: libc::c_int = 0;
    let mut slave_fd: libc::c_int = 0;
    let ret = unsafe { libc::openpty(&mut master_fd, &mut slave_fd, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut()) };
    if ret != 0 {
        return;
    }

    // fork child
    let pid = unsafe { libc::fork() };
    if pid < 0 {
        unsafe {
            libc::close(master_fd);
            libc::close(slave_fd);
        }
        return;
    }

    if pid == 0 {
        // child process
        unsafe {
            libc::close(master_fd);
            libc::setsid();
            libc::ioctl(slave_fd, libc::TIOCSCTTY, 0);
            libc::dup2(slave_fd, 0);
            libc::dup2(slave_fd, 1);
            libc::dup2(slave_fd, 2);
            if slave_fd > 2 {
                libc::close(slave_fd);
            }

            // set TERM
            let term = std::ffi::CString::new("TERM=xterm-256color").unwrap();
            libc::putenv(term.into_raw());

            let shell_c = std::ffi::CString::new(shell.as_str()).unwrap();
            libc::execl(shell_c.as_ptr(), shell_c.as_ptr(), std::ptr::null::<libc::c_char>());
            libc::_exit(1);
        }
    }

    // parent: close slave, use master
    unsafe { libc::close(slave_fd); }

    // set master non-blocking for tokio
    unsafe {
        let flags = libc::fcntl(master_fd, libc::F_GETFL);
        libc::fcntl(master_fd, libc::F_SETFL, flags | libc::O_NONBLOCK);
    }

    let master_file = unsafe { std::fs::File::from_raw_fd(master_fd) };
    let master = tokio::fs::File::from_std(master_file);
    let (mut reader, mut writer) = tokio::io::split(master);

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // PTY → WebSocket
    let pty_to_ws = tokio::spawn(async move {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf).await {
                Ok(0) => break,
                Ok(n) => {
                    let text = String::from_utf8_lossy(&buf[..n]).to_string();
                    if ws_sender.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
                }
                Err(_) => break,
            }
        }
    });

    // WebSocket → PTY
    let ws_to_pty = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // check for resize command
                    if text.starts_with("\x01{") {
                        if let Ok(resize) = serde_json::from_str::<ResizeMsg>(&text[1..]) {
                            unsafe {
                                let ws = libc::winsize {
                                    ws_row: resize.rows,
                                    ws_col: resize.cols,
                                    ws_xpixel: 0,
                                    ws_ypixel: 0,
                                };
                                libc::ioctl(master_fd, libc::TIOCSWINSZ, &ws);
                            }
                        }
                    } else {
                        let _ = writer.write_all(text.as_bytes()).await;
                    }
                }
                Message::Binary(data) => {
                    let _ = writer.write_all(&data).await;
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // wait for either to finish
    tokio::select! {
        _ = pty_to_ws => {},
        _ = ws_to_pty => {},
    }

    // cleanup
    unsafe {
        libc::kill(pid, libc::SIGTERM);
        libc::waitpid(pid, std::ptr::null_mut(), libc::WNOHANG);
    }
}

#[derive(serde::Deserialize)]
struct ResizeMsg {
    cols: u16,
    rows: u16,
}
