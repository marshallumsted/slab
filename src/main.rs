mod apps;
mod config;
mod state;
mod theme;

use std::sync::Arc;
use std::time::Duration;

use smithay::{
    backend::renderer::{
        damage::OutputDamageTracker,
        element::{
            solid::SolidColorRenderElement,
            Id as ElementId, Kind,
        },
        gles::GlesRenderer,
        utils::CommitCounter,
    },
    output::{Mode as OutputMode, Output, PhysicalProperties, Subpixel},
    reexports::{
        calloop::EventLoop,
        wayland_server::{Display, ListeningSocket},
    },
    utils::{Physical, Rectangle, Size, Transform},
};
use tracing::{error, info, warn};
use smithay::reexports::winit::platform::pump_events::PumpStatus;

use crate::state::ClientState;
use smithay::wayland::compositor::CompositorClientState;

// ---------------------------------------------------------------------------
// Custom render element enum
// ---------------------------------------------------------------------------

smithay::backend::renderer::element::render_elements! {
    pub SlabRenderElement<=GlesRenderer>;
    Solid=SolidColorRenderElement,
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_env("SLAB_LOG")
                .unwrap_or_else(|_| {
                    tracing_subscriber::EnvFilter::try_from_default_env()
                        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
                }),
        )
        .init();

    info!("slab-base starting (winit backend)");
    run_winit();
}

// ---------------------------------------------------------------------------
// Winit backend
// ---------------------------------------------------------------------------

fn run_winit() {
    let mut event_loop: EventLoop<state::Slab> =
        EventLoop::try_new().expect("failed to create event loop");
    let loop_handle = event_loop.handle();

    let mut display: Display<state::Slab> =
        Display::new().expect("failed to create wayland display");
    let display_handle = display.handle();

    // Bind a wayland listening socket
    let listening_socket =
        ListeningSocket::bind_auto("wayland", 0..33).expect("failed to bind wayland socket");
    let socket_name = listening_socket
        .socket_name()
        .expect("socket has no name")
        .to_os_string();
    info!("wayland socket: {:?}", socket_name);
    // SAFETY: we set this before spawning any threads.
    unsafe { std::env::set_var("WAYLAND_DISPLAY", &socket_name); }

    // Create compositor state
    let mut slab = state::Slab::new(&display_handle, &loop_handle);

    // Initialize winit backend
    let (mut backend, mut winit_evt) = smithay::backend::winit::init::<GlesRenderer>()
        .expect("failed to initialize winit backend");

    // Query window size for the output
    let win_size = backend.window_size();
    let mode = OutputMode {
        size: win_size,
        refresh: 60_000,
    };

    // Create an output matching the winit window
    let output = Output::new(
        "winit".to_string(),
        PhysicalProperties {
            size: (0, 0).into(),
            subpixel: Subpixel::Unknown,
            make: "slab".to_string(),
            model: "winit".to_string(),
        },
    );
    output.create_global::<state::Slab>(&display_handle);
    output.change_current_state(
        Some(mode),
        Some(Transform::Flipped180),
        None,
        Some((0, 0).into()),
    );
    output.set_preferred(mode);

    // Map the output in the space
    slab.space.map_output(&output, (0, 0));

    // Set window title
    backend.window().set_title("[S] slab");

    // Damage tracker
    let mut damage_tracker = OutputDamageTracker::from_output(&output);

    // Main loop
    info!("entering winit event loop");
    let mut running = true;

    while running {
        // Accept new wayland clients
        let mut dh = display.handle();
        while let Some(stream) = listening_socket.accept().unwrap() {
            dh.insert_client(
                stream,
                Arc::new(ClientState {
                    compositor_state: CompositorClientState::default(),
                }),
            )
            .unwrap();
        }

        // Dispatch pending wayland client requests
        display.dispatch_clients(&mut slab).unwrap();
        display.flush_clients().unwrap();

        // Dispatch winit events
        let status = winit_evt.dispatch_new_events(|event| {
            use smithay::backend::winit::WinitEvent;
            match event {
                WinitEvent::Resized { size, .. } => {
                    let new_mode = OutputMode {
                        size,
                        refresh: 60_000,
                    };
                    output.change_current_state(Some(new_mode), None, None, None);
                }
                WinitEvent::CloseRequested => {
                    running = false;
                }
                WinitEvent::Input(_) => {}
                _ => {}
            }
        });

        match status {
            PumpStatus::Exit(_) => {
                running = false;
                continue;
            }
            PumpStatus::Continue => {}
        }

        // Get output size
        let output_size = output
            .current_mode()
            .map(|m| m.size)
            .unwrap_or_else(|| (800, 600).into());
        let scale = output.current_scale().fractional_scale();

        // Build render elements: topbar + taskbar
        let elements = build_render_elements(output_size, scale);

        // Bind and render
        let render_result = {
            match backend.bind() {
                Ok((renderer, mut framebuffer)) => {
                    let bg = theme::dark::BG.to_array();
                    match damage_tracker.render_output(
                        renderer,
                        &mut framebuffer,
                        0,
                        &elements,
                        bg,
                    ) {
                        Ok(render_output) => {
                            let damage: Vec<Rectangle<i32, Physical>> =
                                render_output.damage.map(|d| d.clone()).unwrap_or_default();
                            Ok(damage)
                        }
                        Err(err) => {
                            warn!("render error: {err:?}");
                            Err(false)
                        }
                    }
                }
                Err(e) => {
                    error!("bind error: {e}");
                    Err(true)
                }
            }
        };
        match render_result {
            Ok(damage) => {
                let d: Option<&[Rectangle<i32, Physical>]> = if damage.is_empty() {
                    None
                } else {
                    Some(&damage)
                };
                if let Err(e) = backend.submit(d) {
                    warn!("submit error: {e}");
                }
            }
            Err(true) => {
                running = false;
            }
            Err(false) => {}
        }

        // Flush client frame callbacks
        slab.space.elements().for_each(|window| {
            window.send_frame(
                &output,
                slab.start_time.elapsed(),
                Some(Duration::ZERO),
                |_, _| Some(output.clone()),
            );
        });

        slab.space.refresh();

        // Dispatch calloop (timers, etc.)
        if let Err(e) = event_loop.dispatch(Some(Duration::from_millis(16)), &mut slab) {
            error!("event loop error: {e}");
            running = false;
        }
    }

    info!("slab-base shutting down");
}

/// Build render elements: topbar and taskbar as solid color rectangles.
fn build_render_elements(
    output_size: Size<i32, Physical>,
    scale: f64,
) -> Vec<SlabRenderElement> {
    let mut elements = Vec::new();
    let w = output_size.w;
    let h = output_size.h;

    let topbar_h = (theme::TOPBAR_HEIGHT as f64 * scale) as i32;
    let taskbar_h = (theme::TASKBAR_HEIGHT as f64 * scale) as i32;

    // Top bar
    let topbar_geo = Rectangle::from_size((w, topbar_h).into());
    let topbar = SolidColorRenderElement::new(
        ElementId::new(),
        topbar_geo,
        CommitCounter::default(),
        theme::dark::TOPBAR_BG.to_array(),
        Kind::Unspecified,
    );
    elements.push(SlabRenderElement::Solid(topbar));

    // Bottom taskbar
    let taskbar_geo = Rectangle::new((0, h - taskbar_h).into(), (w, taskbar_h).into());
    let taskbar = SolidColorRenderElement::new(
        ElementId::new(),
        taskbar_geo,
        CommitCounter::default(),
        theme::dark::TASKBAR_BG.to_array(),
        Kind::Unspecified,
    );
    elements.push(SlabRenderElement::Solid(taskbar));

    elements
}
