import { int, randomDigits, randomInt, range, weightedSum, zeroPad } from '../../utils';
import { ValidationError, type GeneratesNumbers, type ParsesNumbers } from '../../types';
import { AbstractDocument } from '../abstract-document';

/** Componentes de un DPI válido. */
export class DpiData {
  constructor(
    /** Los ocho dígitos del número de registro. */
    readonly serial: string,
    /** Departamento de vecindad 1-22. */
    readonly departmentCode: number,
    /** Municipio dentro del departamento. */
    readonly municipalityCode: number,
  ) {}
}

const DEPARTMENTS = 22;

/**
 * DPI / CUI (RENAP): 8 dígitos + verificador + departamento (2) + municipio (2).
 * Nivel: completa en el verificador (pesos 2..9, módulo 11; fórmula de código abierto)
 * y en el departamento (01-22). No se valida la tabla de municipios por departamento.
 */
export class Dpi extends AbstractDocument implements GeneratesNumbers, ParsesNumbers<DpiData> {
  protected override readonly pattern: RegExp = /^\d{13}$/;

  protected override checkContent(compact: string): ValidationError | null {
    const department = int(compact.slice(9, 11));
    const municipality = int(compact.slice(11, 13));
    if (department < 1 || department > DEPARTMENTS || municipality < 1) {
      return ValidationError.Component;
    }
    return Dpi.checkDigit(compact) === Number(compact.charAt(8)) ? null : ValidationError.Checksum;
  }

  generate(): string {
    let body: string;
    do {
      body = randomDigits(8);
    } while (Dpi.checkDigit(body) === 10);
    return body + String(Dpi.checkDigit(body)) + zeroPad(randomInt(1, DEPARTMENTS), 2) + zeroPad(randomInt(1, 20), 2);
  }

  parse(number: string): DpiData | null {
    const compact = this.validated(number);
    if (compact === null) {
      return null;
    }
    return new DpiData(compact.slice(0, 8), int(compact.slice(9, 11)), int(compact.slice(11, 13)));
  }

  override format(number: string): string {
    return this.group(number, [4, 5, 4], ' ');
  }

  /** Verificador de los 8 primeros dígitos; 10 no es un dígito y nunca aparece en un CUI. */
  private static checkDigit(digits: string): number {
    return weightedSum(digits, range(2, 9)) % 11;
  }
}

/**
 * NIT (SAT). Nivel: completa (fórmula de código abierto).
 * Módulo 11, verificador 0-9 o K. Desde 2023-10-04 los NIT nuevos son los primeros 9
 * dígitos del CUI; con cuerpo de 8 dígitos ambos verificadores coinciden (los pesos
 * 9..2 y 2..9 suman 11), por lo que no requiere regla aparte.
 */
export class Nit extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^\d{1,11}[0-9K]$/;

  protected override checkContent(compact: string): ValidationError | null {
    return Nit.checkDigit(compact.slice(0, -1)) === compact.slice(-1) ? null : ValidationError.Checksum;
  }

  generate(): string {
    const body = randomDigits(randomInt(5, 8), true);
    return body + Nit.checkDigit(body);
  }

  override format(number: string): string {
    return this.groupLast(number);
  }

  private static checkDigit(body: string): string {
    const sum = weightedSum(body, range(body.length + 1, 2));
    const digit = (11 - (sum % 11)) % 11;
    return digit === 10 ? 'K' : String(digit);
  }
}
