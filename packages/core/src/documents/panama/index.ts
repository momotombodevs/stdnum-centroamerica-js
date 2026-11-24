import { type GeneratesNumbers, type ParsesNumbers, ValidationError } from '../../types';
import { int, randomInt } from '../../utils';
import { AbstractDocument } from '../abstract-document';

/** Tipo de cédula de Panamá, según el prefijo. */
export const CedulaKind = {
  /** Nacido en Panamá: P-TOMO-ASIENTO. */
  Birth: 'birth',
  /** Nacido en el extranjero: PE-TOMO-ASIENTO. */
  BornAbroad: 'bornAbroad',
  /** Naturalizado: N-TOMO-ASIENTO. */
  Naturalized: 'naturalized',
  /** Extranjero domiciliado: E-P-ORDEN. */
  ForeignResident: 'foreignResident',
} as const;
export type CedulaKind = (typeof CedulaKind)[keyof typeof CedulaKind];

/** Componentes de una cédula de Panamá, tal como aparecen en el número. */
export class CedulaData {
  constructor(
    readonly kind: CedulaKind,
    /** Clave de provincia (1-9 oficial; 10-13 de fuentes de terceros); null en PE y N. */
    readonly provinceCode: number | null = null,
    /** `PI` (indígena) o `AV` (anterior al Registro Civil); fuentes de terceros. */
    readonly suffix: string | null = null,
    /** Tomo; null en la cédula de extranjero domiciliado. */
    readonly volume: string | null = null,
    /** Asiento (en la de extranjero domiciliado, el número de orden). */
    readonly entry: string = '',
  ) {}
}

const PROVINCE = '(?:1[0-3]|[1-9])';

/**
 * Cédula de identidad personal (Tribunal Electoral). Nivel: formato; no tiene dígito
 * verificador. Tomo y asiento tienen longitud variable, así que los guiones forman
 * parte del número: la forma canónica es format() (normalize()); compact(), como en
 * el resto del paquete, quita los separadores y por eso pierde esa información.
 *
 * Formas oficiales (Decreto 53 de 1958, art. 9):
 * - nacimiento:              P-TOMO-ASIENTO    8-926-1601
 * - nacido en el extranjero: PE-TOMO-ASIENTO   PE-5-687
 * - naturalizado:            N-TOMO-ASIENTO    N-19-473
 * - extranjero domiciliado:  E-P-ORDEN         E-8-12345
 *
 * No oficial (fuentes de terceros): las claves 10-13 y los sufijos PI y AV.
 */
export class Cedula extends AbstractDocument implements GeneratesNumbers, ParsesNumbers<CedulaData> {
  static readonly PATTERN: RegExp = new RegExp(
    '^(?:' +
      `${PROVINCE}-(?:(?:PI|AV)-)?\\d{1,6}-\\d{1,6}` +
      '|PE-\\d{1,6}-\\d{1,6}' +
      '|N-\\d{1,6}-\\d{1,6}' +
      `|E-${PROVINCE}-\\d{1,7}` +
      ')$',
  );

  protected override readonly pattern: RegExp = Cedula.PATTERN;

  /** Mayúsculas, con un solo guion entre grupos. */
  static normalize(number: string): string {
    return String(number)
      .trim()
      .replace(/[\s-]+/g, '-')
      .toUpperCase();
  }

  protected override prepare(number: string): string {
    return Cedula.normalize(number);
  }

  generate(): string {
    return `${randomInt(1, 9)}-${randomInt(1, 999)}-${randomInt(1, 99999)}`;
  }

  parse(number: string): CedulaData | null {
    const normalized = this.validated(number);
    if (normalized === null) {
      return null;
    }
    const parts = normalized.split('-') as [string, string, string, string?];
    switch (parts[0]) {
      case 'PE':
      case 'N': {
        const kind = parts[0] === 'PE' ? CedulaKind.BornAbroad : CedulaKind.Naturalized;
        return new CedulaData(kind, null, null, parts[1], parts[2]);
      }
      case 'E':
        return new CedulaData(CedulaKind.ForeignResident, int(parts[1]), null, null, parts[2]);
      default:
        return parts.length === 4
          ? new CedulaData(CedulaKind.Birth, int(parts[0]), parts[1], parts[2], parts[3])
          : new CedulaData(CedulaKind.Birth, int(parts[0]), null, parts[1], parts[2]);
    }
  }

  override format(number: string): string {
    return Cedula.normalize(number);
  }
}

/** La cédula y las demás formas de RUC: PE, NT y persona jurídica. */
const RUC_FORMS: readonly RegExp[] = [
  Cedula.PATTERN,
  /^(?:PE-\d{1,6}-\d{1,6}-\d{1,6}|(?:1[0-3]|[1-9])-PE-\d{1,6}-\d{1,6})$/,
  /^(?:1[0-3]|[1-9])-NT-\d{1,6}-\d{1,6}$/,
  /^\d{1,10}-\d{1,6}-\d{1,8}$/,
];

/**
 * RUC (DGI). Nivel: formato, sin el dígito verificador.
 * La ficha técnica de factura electrónica de la DGI define el RUC como alfanumérico de
 * 5 a 21 posiciones, con letras y guiones. El DV (2 dígitos) lo asigna la DGI y no
 * publica fórmula, por lo que no se valida. La forma canónica con guiones es format().
 *
 * Formas aceptadas: la cédula; PE-P-TOMO-ASIENTO y P-PE-TOMO-ASIENTO; Número
 * Tributario P-NT-TOMO-ASIENTO; persona jurídica con tres grupos numéricos.
 */
export class Ruc extends AbstractDocument implements GeneratesNumbers {
  protected override prepare(number: string): string {
    return Cedula.normalize(number);
  }

  protected override check(compact: string): ValidationError | null {
    const fits = compact.length >= 5 && compact.length <= 21 && RUC_FORMS.some((form) => form.test(compact));
    return fits ? null : ValidationError.Format;
  }

  /** Una cédula es un RUC válido (persona natural). */
  generate(): string {
    return new Cedula().generate();
  }

  override format(number: string): string {
    return Cedula.normalize(number);
  }
}
