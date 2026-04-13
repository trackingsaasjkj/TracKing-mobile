export const darkColors = {
  // Brand
  primary:      '#2563EB', // Azul vibrante del botón y cabecera
  primaryLight: '#3B82F6', // Azul del badge "+12%"
  primaryDark:  '#1D4ED8', // Azul profundo para estados activos
  primaryBg:    '#1E293B', // Fondo azul grisáceo (tarjetas de métricas)

  // Semantic states (Ajustados para contraste en fondo oscuro)
  success:      '#22C55E', // Verde esmeralda (propinas)
  successBg:    '#052E16', // Verde bosque muy oscuro para el fondo del icono
  successText:  '#86EFAC', // Verde pastel para lectura clara

  warning:      '#F59E0B', // Ámbar/Naranja (tiempo)
  warningBg:    '#451A03', // Marrón oscuro para fondo de icono
  warningText:  '#FDE047', // Amarillo suave

  danger:       '#F87171', // Rojo suave (deducciones)
  dangerBg:     '#450A0A', // Rojo vino muy oscuro
  dangerText:   '#FECACA', // Rosa/Rojo muy claro

  info:         '#8B5CF6', // Violeta (distancia)
  infoBg:       '#2E1065', // Violeta profundo
  infoText:     '#DDD6FE', // Lavanda claro

  // Neutrals (Paleta Slate/Navy de la imagen)
  neutral50:    '#F8FAFC', // Texto principal (blanco casi puro)
  neutral100:   '#E2E8F0', // Fondos sutiles / chips
  neutral200:   '#94A3B8', // Texto secundario / descriptivo
  neutral400:   '#64748B', // Iconos en estado neutro / placeholders
  neutral500:   '#94A3B8', // Texto terciario / subtítulos
  neutral600:   '#334155', // Separadores entre filas
  neutral800:   '#E2E8F0', // Texto principal sobre superficies oscuras
  neutral900:   '#F8FAFC', // Texto de mayor jerarquía / títulos

  // Base
  white:        '#FFFFFF',
  black:        '#000000',
  transparent:  'transparent',

  // Background & surfaces
  background:   '#0B121E', // fondo base de pantallas
  surface:      '#131F2E', // cards, headers, tab bar, modales
  surfaceRaised: '#1A2840', // cards elevadas, dropdowns
} as const;

export type DarkColorKey = keyof typeof darkColors;
