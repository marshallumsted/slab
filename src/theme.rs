/// slab design tokens — same values as slab-web CSS variables

#[derive(Debug, Clone, Copy)]
pub struct Color(pub f32, pub f32, pub f32, pub f32); // RGBA 0.0-1.0

impl Color {
    pub const fn rgb(r: u8, g: u8, b: u8) -> Self {
        Self(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0, 1.0)
    }

    pub const fn rgba(r: u8, g: u8, b: u8, a: f32) -> Self {
        Self(r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0, a)
    }

    pub fn to_array(&self) -> [f32; 4] {
        [self.0, self.1, self.2, self.3]
    }
}

/// Dark theme (default)
pub mod dark {
    use super::Color;

    pub const BLACK: Color = Color::rgb(0, 0, 0);
    pub const WHITE: Color = Color::rgb(255, 255, 255);
    pub const RED: Color = Color::rgb(230, 50, 39);       // #e63227
    pub const RED_HOVER: Color = Color::rgb(204, 43, 34);  // #cc2b22

    pub const GRAY_200: Color = Color::rgb(224, 224, 224);
    pub const GRAY_300: Color = Color::rgb(204, 204, 204);
    pub const GRAY_500: Color = Color::rgb(153, 153, 153);
    pub const GRAY_600: Color = Color::rgb(68, 68, 68);
    pub const GRAY_700: Color = Color::rgb(51, 51, 51);
    pub const GRAY_800: Color = Color::rgb(26, 26, 26);
    pub const GRAY_900: Color = Color::rgb(17, 17, 17);

    pub const BG: Color = BLACK;
    pub const FG: Color = WHITE;
    pub const TOPBAR_BG: Color = GRAY_900;
    pub const TASKBAR_BG: Color = RED;
    pub const TILE_BG: Color = GRAY_700;
    pub const TILE_BG_HOVER: Color = GRAY_600;
    pub const WINDOW_BG: Color = GRAY_900;
    pub const WINDOW_BORDER: Color = GRAY_700;
    pub const WINDOW_BORDER_FOCUSED: Color = GRAY_600;
    pub const TITLEBAR_BG: Color = GRAY_800;
    pub const TITLEBAR_BG_FOCUSED: Color = GRAY_700;
}

/// Light theme
pub mod light {
    use super::Color;

    pub const BLACK: Color = Color::rgb(240, 240, 240);
    pub const WHITE: Color = Color::rgb(17, 17, 17);
    pub const RED: Color = Color::rgb(230, 50, 39);
    pub const RED_HOVER: Color = Color::rgb(204, 43, 34);

    pub const GRAY_200: Color = Color::rgb(51, 51, 51);
    pub const GRAY_300: Color = Color::rgb(85, 85, 85);
    pub const GRAY_500: Color = Color::rgb(136, 136, 136);
    pub const GRAY_600: Color = Color::rgb(187, 187, 187);
    pub const GRAY_700: Color = Color::rgb(213, 213, 213);
    pub const GRAY_800: Color = Color::rgb(232, 232, 232);
    pub const GRAY_900: Color = Color::rgb(245, 245, 245);

    pub const BG: Color = BLACK;
    pub const FG: Color = WHITE;
    pub const TOPBAR_BG: Color = GRAY_900;
    pub const TASKBAR_BG: Color = RED;
    pub const TILE_BG: Color = GRAY_700;
    pub const TILE_BG_HOVER: Color = GRAY_600;
    pub const WINDOW_BG: Color = GRAY_900;
    pub const WINDOW_BORDER: Color = GRAY_700;
    pub const WINDOW_BORDER_FOCUSED: Color = GRAY_600;
    pub const TITLEBAR_BG: Color = GRAY_800;
    pub const TITLEBAR_BG_FOCUSED: Color = GRAY_700;
}

// Layout constants
pub const TOPBAR_HEIGHT: i32 = 28;
pub const TASKBAR_HEIGHT: i32 = 44;
pub const WINDOW_TITLEBAR_HEIGHT: i32 = 32;
pub const TILE_GAP: i32 = 3;
pub const TILE_MIN_SIZE: i32 = 160;
