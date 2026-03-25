import { create } from 'zustand';
import type { Service } from '../types/services.types';

interface ServicesState {
  services: Service[];
  setServices: (services: Service[]) => void;
  updateService: (updated: Service) => void;
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: [],
  setServices: (services) => set({ services }),
  updateService: (updated) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === updated.id ? updated : s)),
    })),
}));
