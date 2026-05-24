import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { ThemesColors } from "@/constants/theme";

const STORAGE_KEY = "rushcord_theme";
const DEFAULT_THEME = "dark";

interface ThemeState {
  theme: string;
  setTheme: (theme: string) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,

  setTheme: async (nextTheme) => {
    const validThemes = Object.keys(ThemesColors);
    const theme = validThemes.includes(nextTheme) ? nextTheme : DEFAULT_THEME;
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, theme);
    } catch (e) {
      console.error("Save theme error:", e);
    }
    set({ theme });
  },

  loadTheme: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored && Object.keys(ThemesColors).includes(stored)) {
        set({ theme: stored });
      }
    } catch (e) {
      console.error("Load theme error:", e);
    }
  },
}));

// Dynamic theme hook
export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const colors = ThemesColors[theme as keyof typeof ThemesColors] || ThemesColors.dark;
  return { theme, colors };
}
