import { type GeneratesNumbers, ValidationError } from '../../types';
import { int, randomDigits, randomInt, range, weightedSum } from '../../utils';
import { AbstractDocument } from '../abstract-document';

const DUI_WEIGHTS = range(9, 2);
const OLD_NIT_WEIGHTS = range(14, 2);

/** DUI (RNPN): 8 dígitos + verificador (pesos 9..2, módulo 10; fórmula de código abierto). Nivel: completa. */
export class Dui extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^\d{9}$/;

  protected override checkContent(compact: string): ValidationError | null {
    return Dui.checkDigit(compact) === Number(compact.charAt(8)) ? null : ValidationError.Checksum;
  }

  generate(): string {
    const body = randomDigits(8);
    return body + String(Dui.checkDigit(body));
  }

  override format(number: string): string {
    return this.group(number, [8, 1]);
  }

  /** Verificador de los 8 primeros dígitos. */
  private static checkDigit(digits: string): number {
    return (10 - (weightedSum(digits, DUI_WEIGHTS) % 10)) % 10;
  }
}

export interface NitOptions {
  /** DUI con el que se validan los NIT de 9 dígitos. */
  dui?: Dui;
}

const NEW_WEIGHTS = range(0, 12).map((i) => [2, 7, 6, 5, 4, 3][i % 6] as number);

/**
 * NIT (Ministerio de Hacienda), 0000-000000-000-0. Nivel: completa.
 * Los esquemas DTE aceptan 14 dígitos o 9 (el DUI, que sirve como NIT de las
 * personas naturales); el de 9 dígitos se valida como DUI.
 *
 * Verificador de 14 dígitos (fórmula de la librería abierta idsv-php; Hacienda no la
 * publica): con correlativo (posiciones 11-13) <= 100, pesos 14..2 y resto módulo 11
 * (10 pasa a 0); con correlativo mayor, pesos 2,7,6,5,4,3 repetidos y dígito 11 - resto
 * (0 si el resto es 0 o 1).
 */
export class Nit extends AbstractDocument implements GeneratesNumbers {
  private readonly dui: Dui;

  constructor(options: NitOptions = {}) {
    super();
    this.dui = options.dui ?? new Dui();
  }

  protected override check(compact: string): ValidationError | null {
    switch (compact.length) {
      case 9:
        return this.dui.validate(compact).error;
      case 14:
        if (!/^\d+$/.test(compact)) {
          return ValidationError.Format;
        }
        return Nit.checkDigit(compact) === Number(compact.charAt(13)) ? null : ValidationError.Checksum;
      default:
        return ValidationError.Format;
    }
  }

  generate(): string {
    const body = randomDigits(13);
    return body + String(Nit.checkDigit(`${body}0`));
  }

  override format(number: string): string {
    return this.compact(number).length === 9 ? this.dui.format(number) : this.group(number, [4, 6, 3, 1]);
  }

  private static checkDigit(nit: string): number {
    if (int(nit.slice(10, 13)) <= 100) {
      const remainder = weightedSum(nit, OLD_NIT_WEIGHTS) % 11;
      return remainder === 10 ? 0 : remainder;
    }
    const remainder = weightedSum(nit, NEW_WEIGHTS) % 11;
    return remainder > 1 ? 11 - remainder : 0;
  }
}

/**
 * NRC (Ministerio de Hacienda): 1 a 8 dígitos sin guiones, según los esquemas DTE
 * (^[0-9]{1,8}$; la factura de consumidor exige al menos 2). Nivel: formato.
 */
export class Nrc extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^\d{1,8}$/;

  override format(number: string): string {
    return this.groupLast(number);
  }

  generate(): string {
    return randomDigits(randomInt(1, 8));
  }
}
