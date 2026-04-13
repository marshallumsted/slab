use smithay::{
    delegate_compositor, delegate_data_device, delegate_output, delegate_seat, delegate_shm,
    delegate_xdg_shell,
    desktop::{Space, Window},
    input::{Seat, SeatHandler, SeatState},
    reexports::wayland_server::{
        backend::ClientData,
        protocol::{wl_buffer, wl_seat, wl_surface::WlSurface},
        Client, DisplayHandle,
    },
    utils::{Logical, Serial, Size},
    wayland::{
        buffer::BufferHandler,
        compositor::{CompositorClientState, CompositorHandler, CompositorState},
        output::OutputHandler,
        selection::{
            data_device::{
                ClientDndGrabHandler, DataDeviceHandler, DataDeviceState, ServerDndGrabHandler,
            },
            SelectionHandler,
        },
        shell::xdg::{
            PopupSurface, PositionerState, ToplevelSurface, XdgShellHandler, XdgShellState,
        },
        shm::{ShmHandler, ShmState},
    },
};

use crate::{
    apps::{scan_apps, scan_desktop_apps, DesktopApp},
    config::SlabConfig,
};

/// Core compositor state.
pub struct Slab {
    pub compositor_state: CompositorState,
    pub xdg_shell_state: XdgShellState,
    pub shm_state: ShmState,
    pub seat_state: SeatState<Self>,
    pub data_device_state: DataDeviceState,
    pub seat: Seat<Self>,
    pub display_handle: DisplayHandle,
    pub space: Space<Window>,
    pub output_size: Size<i32, Logical>,
    pub config: SlabConfig,
    pub desktop_apps: Vec<DesktopApp>,
    pub start_time: std::time::Instant,
}

impl Slab {
    pub fn new(
        display_handle: &DisplayHandle,
        _loop_handle: &calloop::LoopHandle<'static, Self>,
    ) -> Self {
        let compositor_state = CompositorState::new::<Self>(display_handle);
        let xdg_shell_state = XdgShellState::new::<Self>(display_handle);
        let shm_state = ShmState::new::<Self>(display_handle, vec![]);
        let mut seat_state = SeatState::new();
        let data_device_state = DataDeviceState::new::<Self>(display_handle);

        // OutputManagerState is created via delegate_output; we just need the handler.

        let seat = seat_state.new_wl_seat(display_handle, "seat-0");

        let config = SlabConfig::load();
        let _apps = scan_apps();
        let desktop_apps = scan_desktop_apps();

        tracing::info!("Loaded {} system apps", desktop_apps.len());

        Self {
            compositor_state,
            xdg_shell_state,
            shm_state,
            seat_state,
            data_device_state,
            seat,
            display_handle: display_handle.clone(),
            space: Space::default(),
            output_size: Size::from((1920, 1080)),
            config,
            desktop_apps,
            start_time: std::time::Instant::now(),
        }
    }

    /// Launch a desktop app by exec command
    pub fn launch_app(&self, exec: &str) {
        let wayland_display = std::env::var("WAYLAND_DISPLAY").unwrap_or_default();
        match std::process::Command::new("sh")
            .arg("-c")
            .arg(exec)
            .env("WAYLAND_DISPLAY", &wayland_display)
            .env_remove("DISPLAY")
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
        {
            Ok(_) => tracing::info!("Launched: {exec}"),
            Err(e) => tracing::error!("Failed to launch {exec}: {e}"),
        }
    }
}

// ---------------------------------------------------------------------------
// Per-client state
// ---------------------------------------------------------------------------

pub struct ClientState {
    pub compositor_state: CompositorClientState,
}

impl ClientData for ClientState {
    fn initialized(&self, _client_id: smithay::reexports::wayland_server::backend::ClientId) {}
    fn disconnected(
        &self,
        _client_id: smithay::reexports::wayland_server::backend::ClientId,
        _reason: smithay::reexports::wayland_server::backend::DisconnectReason,
    ) {
    }
}

// ---------------------------------------------------------------------------
// Handler implementations
// ---------------------------------------------------------------------------

impl BufferHandler for Slab {
    fn buffer_destroyed(&mut self, _buffer: &wl_buffer::WlBuffer) {}
}

impl CompositorHandler for Slab {
    fn compositor_state(&mut self) -> &mut CompositorState {
        &mut self.compositor_state
    }

    fn client_compositor_state<'a>(&self, client: &'a Client) -> &'a CompositorClientState {
        &client.get_data::<ClientState>().unwrap().compositor_state
    }

    fn commit(&mut self, _surface: &WlSurface) {
        // Minimal: do nothing for now.
    }
}

impl ShmHandler for Slab {
    fn shm_state(&self) -> &ShmState {
        &self.shm_state
    }
}

impl SeatHandler for Slab {
    type KeyboardFocus = WlSurface;
    type PointerFocus = WlSurface;
    type TouchFocus = WlSurface;

    fn seat_state(&mut self) -> &mut SeatState<Self> {
        &mut self.seat_state
    }

    fn cursor_image(
        &mut self,
        _seat: &Seat<Self>,
        _image: smithay::input::pointer::CursorImageStatus,
    ) {
    }

    fn focus_changed(
        &mut self,
        _seat: &Seat<Self>,
        _focused: Option<&WlSurface>,
    ) {
    }
}

impl XdgShellHandler for Slab {
    fn xdg_shell_state(&mut self) -> &mut XdgShellState {
        &mut self.xdg_shell_state
    }

    fn new_toplevel(&mut self, surface: ToplevelSurface) {
        let window = Window::new_wayland_window(surface.clone());
        self.space
            .map_element(window, smithay::utils::Point::from((0, 0)), false);
        surface.send_configure();
    }

    fn new_popup(&mut self, _surface: PopupSurface, _positioner: PositionerState) {}

    fn toplevel_destroyed(&mut self, surface: ToplevelSurface) {
        let window = self
            .space
            .elements()
            .find(|w| {
                w.toplevel()
                    .map(|tl| tl == &surface)
                    .unwrap_or(false)
            })
            .cloned();
        if let Some(w) = window {
            self.space.unmap_elem(&w);
        }
    }

    fn grab(&mut self, _surface: PopupSurface, _seat: wl_seat::WlSeat, _serial: Serial) {}

    fn reposition_request(
        &mut self,
        _surface: PopupSurface,
        _positioner: PositionerState,
        _token: u32,
    ) {
    }
}

impl DataDeviceHandler for Slab {
    fn data_device_state(&self) -> &DataDeviceState {
        &self.data_device_state
    }
}

impl SelectionHandler for Slab {
    type SelectionUserData = ();
}

impl ClientDndGrabHandler for Slab {}
impl ServerDndGrabHandler for Slab {}

impl OutputHandler for Slab {}

// ---------------------------------------------------------------------------
// Delegate macros
// ---------------------------------------------------------------------------

delegate_compositor!(Slab);
delegate_shm!(Slab);
delegate_seat!(Slab);
delegate_xdg_shell!(Slab);
delegate_output!(Slab);
delegate_data_device!(Slab);
