/**
 * Configuración centralizada para el sistema de swipe navigation
 * Permite ajustar parámetros sin modificar los hooks
 */

export const SWIPE_CONFIG = {
  /**
   * Distancia mínima en píxeles para considerar un gesto como swipe
   * Valores más bajos = más sensible
   * Valores más altos = menos sensible
   * Rango recomendado: 30-100
   */
  THRESHOLD: 50,

  /**
   * Ángulo máximo (en grados) para considerar un movimiento como horizontal
   * Valores más altos = más tolerancia con movimientos diagonales
   * Rango recomendado: 30-60
   */
  MAX_ANGLE: 45,

  /**
   * Habilitar/deshabilitar swipe navigation globalmente
   */
  ENABLED: true,

  /**
   * Habilitar logs de debug (solo en desarrollo)
   */
  DEBUG: __DEV__,

  /**
   * Duración máxima del swipe en milisegundos
   * Si el swipe tarda más, se ignora
   */
  MAX_DURATION: 1000,
} as const;

/**
 * Orden de los tabs (debe coincidir con MainTabParamList)
 */
export const TAB_ORDER = ['Home', 'Orders', 'Earnings', 'Config'] as const;

/**
 * Tipo para el orden de tabs
 */
export type TabName = typeof TAB_ORDER[number];
