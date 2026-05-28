import type { Service } from '../types/services.types';

/**
 * Devuelve el nombre legible del método de pago de un servicio.
 * Prioriza el nombre del objeto paymentMethod (tabla configurable),
 * luego fallback a enum payment_method para datos históricos.
 */
export function getPaymentLabel(service: Service): string {
  // Si existe el objeto paymentMethod con nombre, usarlo
  if (service.paymentMethod?.name) {
    return service.paymentMethod.name;
  }

  // Fallback a enum payment_method (para compatibilidad con datos históricos)
  const PAYMENT_LABELS: Record<string, string> = {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
    CREDIT: 'Crédito',
  };

  return PAYMENT_LABELS[service.payment_method] ?? service.payment_method ?? '—';
}
