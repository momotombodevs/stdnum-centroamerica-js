/** Motivo por el que un número no es válido. */
export const ValidationError = {
  /** Longitud, caracteres o estructura incorrectos. */
  Format: 'format',
  /** Un componente (fecha, departamento, municipio, prefijo) fuera de lo permitido. */
  Component: 'component',
  /** El dígito o la letra de control no coincide. */
  Checksum: 'checksum',
} as const;
export type ValidationError = (typeof ValidationError)[keyof typeof ValidationError];

/** Alcance de la validación de un documento. */
export const Level = {
  /** Valida formato y dígito o letra de control. */
  Complete: 'complete',
  /** Valida longitud, caracteres y rangos básicos, sin dígito de control. */
  Format: 'format',
} as const;
export type Level = (typeof Level)[keyof typeof Level];

/** Resultado de validar un número: `error` es null si es válido. */
export class ValidationResult {
  constructor(readonly error: ValidationError | null = null) {}

  isValid(): boolean {
    return this.error === null;
  }
}

export interface Document {
  isValid(number: string): boolean;
  validate(number: string): ValidationResult;
  format(number: string): string;
  compact(number: string): string;
}

/**
 * Documento capaz de producir números sintéticos que pasan su propia validación.
 * Los rangos que elige (años, municipios) son decisión del generador, no reglas del documento.
 */
export interface GeneratesNumbers {
  /** Número aleatorio válido, sin separadores salvo que el documento los exija (Panamá). Puede coincidir por azar con uno real. */
  generate(): string;
}

/**
 * Documento cuyo número codifica datos (fecha de nacimiento, municipio, tipo).
 * Los componentes son datos personales: no se validan contra ningún registro,
 * solo se leen de la estructura del número.
 */
export interface ParsesNumbers<T extends object = object> {
  /** Componentes de un número válido, o null si no lo es. */
  parse(number: string): T | null;
}

/** Información de un documento incluido en el paquete. */
export interface DocumentInfo {
  /** Clave `país.documento`, p. ej. `gt.nit`. */
  readonly key: string;
  /** Código ISO 3166-1 alfa-2, o `ICAO` para estándares internacionales. */
  readonly country: string;
  /** Nombre del documento, p. ej. `NIT`. */
  readonly name: string;
  readonly level: Level;
}

export function isGenerator(document: unknown): document is GeneratesNumbers {
  return typeof (document as Partial<GeneratesNumbers> | null)?.generate === 'function';
}

export function isParser(document: unknown): document is ParsesNumbers {
  return typeof (document as Partial<ParsesNumbers> | null)?.parse === 'function';
}

export function isDocument(document: unknown): document is Document {
  const d = document as Partial<Document> | null;
  return (
    typeof d?.isValid === 'function' &&
    typeof d.validate === 'function' &&
    typeof d.format === 'function' &&
    typeof d.compact === 'function'
  );
}
