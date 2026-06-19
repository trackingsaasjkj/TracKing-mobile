/**
 * Configuración centralizada de URLs del backend.
 *
 * Para cambiar de entorno, modifica solo este archivo.
 *
 * Desarrollo local:  http://192.168.1.7:3000   (reemplaza con tu IPv4, ver con `ipconfig`)
 * Producción:        https://tracking-backend-g4mq.onrender.com
 */

// 🔧 CAMBIAR AQUÍ para alternar entre local y producción
const HTTP_BASE = 'http://192.168.1.7:3000';

// WS deriva automáticamente del HTTP base (http→ws, https→wss)
const WS_BASE = HTTP_BASE.replace(/^http/, 'ws');

export const API_BASE_URL = HTTP_BASE;
export const WS_BASE_URL = WS_BASE;
