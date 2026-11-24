import type { GeneratesNumbers } from '../../types';
import { randomDigits, randomInt } from '../../utils';
import { AbstractDocument } from '../abstract-document';

/** Cédula de identidad (TSE): 9 dígitos sin cero inicial, 0-0000-0000. Nivel: formato. */
export class CedulaFisica extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^[1-9]\d{8}$/;

  override format(number: string): string {
    return this.group(number, [1, 4, 4]);
  }

  generate(): string {
    return randomDigits(9, true);
  }
}

/** Cédula jurídica: 10 dígitos sin guiones (Hacienda, anexos v4.4), 0-000-000000. Nivel: formato. */
export class CedulaJuridica extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^\d{10}$/;

  override format(number: string): string {
    return this.group(number, [1, 3, 6]);
  }

  generate(): string {
    return randomDigits(10);
  }
}

/** DIMEX (Migración): 11 o 12 dígitos sin cero inicial. Nivel: formato. */
export class Dimex extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^[1-9]\d{10,11}$/;

  generate(): string {
    return randomDigits(randomInt(11, 12), true);
  }
}

/** NITE (Tributación): 10 dígitos. Nivel: formato. */
export class Nite extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^\d{10}$/;

  generate(): string {
    return randomDigits(10);
  }
}
