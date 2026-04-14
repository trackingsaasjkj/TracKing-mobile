import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const MAP_DEFAULTS_KEY = 'map_defaults';

export interface MapDefaults {
  lat: number;
  lng: number;
  label: string;
}

const FALLBACK: MapDefaults = { lat: 7.119349, lng: -73.122742, label: 'Bucaramanga' };

interface MapDefaultsState {
  defaults: MapDefaults;
  isHydrated: boolean;
  setDefaults: (d: MapDefaults) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useMapDefaultsStore = create<MapDefaultsState>((set) => ({
  defaults: FALLBACK,
  isHydrated: false,

  setDefaults: async (d: MapDefaults) => {
    await SecureStore.setItemAsync(MAP_DEFAULTS_KEY, JSON.stringify(d));
    set({ defaults: d });
  },

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(MAP_DEFAULTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MapDefaults;
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          set({ defaults: parsed });
        }
      }
    } catch {
      // fallback — no-op
    } finally {
      set({ isHydrated: true });
    }
  },
}));
