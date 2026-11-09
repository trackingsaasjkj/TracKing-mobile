/**
 * Configuración centralizada de URLs del backend.
 *
 * Para cambiar de entorno, modifica solo este archivo.
 *
 * Desarrollo local:  http://192.168.1.7:3000   (reemplaza con tu IPv4, ver con `ipconfig`)
 * Producción:        https://tracking-backend-g4mq.onrender.com
 */

// 🔧 CAMBIAR AQUÍ para alternar entre local y producción
const RAW_HTTP_BASE = 'https://44lhvcz2-3000.use2.devtunnels.ms/';

/** Removes trailing slashes so base + path never produces a double slash. */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Joins a base URL and an API path with exactly one slash between them. */
export function joinApiPath(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}/${path.replace(/^\/+/, '')}`;
}

const HTTP_BASE = normalizeBaseUrl(RAW_HTTP_BASE);

// WS deriva automáticamente del HTTP base (http→ws, https→wss)
const WS_BASE = normalizeBaseUrl(HTTP_BASE.replace(/^http/, 'ws'));

export const API_BASE_URL = HTTP_BASE;
export const WS_BASE_URL = WS_BASE;

/** Builds an absolute API URL from the configured base. */
export function buildApiUrl(path: string): string {
  return joinApiPath(API_BASE_URL, path);
}
