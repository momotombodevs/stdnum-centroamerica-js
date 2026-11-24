import { type GeneratesNumbers, type ParsesNumbers, ValidationError } from '../../types';
import { int, isValidDate, randomDigits, randomInt, randomItem, zeroPad } from '../../utils';
import { AbstractDocument } from '../abstract-document';

const SEXES: readonly string[] = ['M', 'F', 'X', '<'];

/** `<` hasta completar `length`. */
const pad = (text: string, length: number): string => text.padEnd(length, '<');

/** Campo vacío: solo relleno `<`. */
const isFiller = (field: string): boolean => /^<*$/.test(field);

/** Fecha AAMMDD al azar con el año entre `yearMin` y `yearMax` (dos dígitos). */
const randomYymmdd = (yearMin: number, yearMax: number): string =>
  zeroPad(randomInt(yearMin, yearMax), 2) + zeroPad(randomInt(1, 12), 2) + zeroPad(randomInt(1, 28), 2);

/** Datos de una MRZ válida. Las fechas son AAMMDD tal como aparecen: el siglo no se infiere. */
export class MrzData {
  constructor(
    /** Tipo de documento, p. ej. `P` (pasaporte) o `I` (cédula). */
    readonly documentCode: string,
    /** Código ICAO del emisor, p. ej. `GTM`. */
    readonly issuingState: string,
    readonly surname: string,
    readonly givenNames: string,
    readonly documentNumber: string,
    /** Código ICAO de la nacionalidad. */
    readonly nationality: string,
    /** AAMMDD, o null si no se especifica. */
    readonly birthDate: string | null,
    /** `M`, `F` o `X`; null si no se especifica. */
    readonly sex: string | null,
    /** AAMMDD, o null si no se especifica. */
    readonly expiryDate: string | null,
    /** Número personal u otros datos opcionales, sin relleno. */
    readonly optionalData: string,
  ) {}
}

/** Campos de una MRZ compacta, ya separados de la disposición de líneas de cada formato. @internal */
export interface MrzFields {
  readonly code: string;
  readonly issuer: string;
  readonly name: string;
  /** Número de documento completo, incluida la continuación si pasa de nueve caracteres. */
  readonly number: string;
  /** Su carácter de control tal como aparece. */
  readonly numberCheck: string;
  readonly nationality: string;
  readonly birth: string;
  readonly birthCheck: string;
  readonly sex: string;
  readonly expiry: string;
  readonly expiryCheck: string;
  /** Datos opcionales, sin la continuación del número ni su dígito. */
  readonly optional: string;
  /** Dígito de los datos opcionales (solo TD3). */
  readonly optionalCheck: string | null;
  readonly compositeCheck: string;
  /** Texto que cubre el dígito compuesto, en el orden de la especificación. */
  readonly compositeData: string;
}

/** Sin I ni O, que se confunden con 1 y 0. */
const NUMBER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
const SAMPLE_NAMES: Record<string, string> = { ERIKSSON: 'ANNA<MARIA', SAMPLE: 'JOHN', EXAMPLE: 'JANE<ROE' };
const UNKNOWN_DATE = '<<<<<<';
const WEIGHTS = [7, 3, 1] as const;

const rtrimFiller = (s: string): string => s.replace(/<+$/, '');

/**
 * Zona de lectura mecánica (MRZ) de ICAO Doc 9303. Nivel: completa (dígitos de control).
 * Se recibe con o sin saltos de línea: las líneas tienen longitud fija, así que
 * compact() las concatena. Los pesos son 7-3-1; las letras valen A=10 … Z=35 y `<` vale 0.
 *
 * Valida el formato, los componentes (tipo de documento, sexo, fechas, caracteres de
 * emisor, nacionalidad y nombre) y los dígitos de control del número de documento,
 * nacimiento, vencimiento, datos opcionales (TD3) y el compuesto. Una fecha
 * desconocida (`<<<<<<`) lleva `<` o `0` como dígito.
 */
export abstract class AbstractMrz extends AbstractDocument implements GeneratesNumbers, ParsesNumbers<MrzData> {
  /** Primeras letras admitidas en el código de documento. */
  protected abstract readonly documentCodes: string;
  /** Longitud de cada línea. */
  protected abstract readonly lineLength: number;
  /** Posición (desde 0) del dígito compuesto en la MRZ compacta. */
  protected abstract readonly compositeAt: number;

  protected abstract fields(compact: string): MrzFields;

  /** MRZ completa con `<` en lugar del dígito compuesto, que generate() calcula. */
  protected abstract draft(): string;

  generate(): string {
    const draft = this.draft();
    const composite = AbstractMrz.checkDigit(this.fields(draft).compositeData);
    return draft.slice(0, this.compositeAt) + String(composite) + draft.slice(this.compositeAt + 1);
  }

  /** Dígito de control ICAO de una cadena de caracteres `A-Z`, `0-9` y `<`. */
  static checkDigit(field: string): number {
    let sum = 0;
    for (let i = 0; i < field.length; i++) {
      const char = field.charAt(i);
      const value = /\d/.test(char) ? Number(char) : char === '<' ? 0 : char.charCodeAt(0) - 55;
      sum += value * (WEIGHTS[i % 3] as number);
    }
    return sum % 10;
  }

  /**
   * Datos de la MRZ, o null si no es válida. En TD1 los dos campos de datos opcionales
   * se devuelven juntos.
   */
  parse(mrz: string): MrzData | null {
    const compact = this.validated(mrz);
    if (compact === null) {
      return null;
    }
    const f = this.fields(compact);
    const name = rtrimFiller(f.name);
    const split = name.indexOf('<<');
    const surname = split < 0 ? name : name.slice(0, split);
    const given = split < 0 ? '' : name.slice(split + 2);
    return new MrzData(
      rtrimFiller(f.code),
      rtrimFiller(f.issuer),
      surname.replace(/</g, ' ').trim(),
      given.replace(/</g, ' ').trim(),
      rtrimFiller(f.number),
      rtrimFiller(f.nationality),
      f.birth === UNKNOWN_DATE ? null : f.birth,
      f.sex === '<' ? null : f.sex,
      f.expiry === UNKNOWN_DATE ? null : f.expiry,
      rtrimFiller(f.optional),
    );
  }

  /** Cada línea en su renglón. */
  override format(number: string): string {
    const compact = this.compact(number);
    const lines = compact.length / this.lineLength;
    return Number.isInteger(lines) ? this.group(compact, Array<number>(lines).fill(this.lineLength), '\n') : compact;
  }

  protected override checkContent(compact: string): ValidationError | null {
    const fields = this.fields(compact);
    return this.checkComponents(fields) ?? AbstractMrz.checkDigits(fields);
  }

  /**
   * Con un número de más de nueve caracteres, la posición de su dígito lleva `<` y el resto
   * del número y su dígito van al inicio de los datos opcionales.
   *
   * @returns número completo, su dígito y los datos opcionales restantes
   */
  protected static longNumber(number: string, check: string, optional: string): [string, string, string] {
    if (check !== '<') {
      return [number, check, optional];
    }
    const head = optional.split('<')[0] as string;
    return head === ''
      ? [number, '<', optional]
      : [number + head.slice(0, -1), head.slice(-1), optional.slice(head.length)];
  }

  /** Número de documento de ejemplo: nueve caracteres al azar. */
  protected static randomNumber(): string {
    let out = '';
    for (let i = 0; i < 9; i++) {
      out += NUMBER_ALPHABET.charAt(randomInt(0, NUMBER_ALPHABET.length - 1));
    }
    return out;
  }

  protected static randomHolder(): {
    number: string;
    birth: string;
    sex: string;
    expiry: string;
    surname: string;
    given: string;
  } {
    const surname = randomItem(Object.keys(SAMPLE_NAMES));
    return {
      number: AbstractMrz.randomNumber(),
      birth: randomYymmdd(50, 99),
      sex: randomItem(['M', 'F', '<']),
      expiry: randomYymmdd(27, 40),
      surname,
      given: SAMPLE_NAMES[surname] as string,
    };
  }

  /** `<` hasta completar `length`. */
  protected static pad(text: string, length: number): string {
    return pad(text, length);
  }

  protected static randomDigits(length: number): string {
    return randomDigits(length);
  }

  private checkComponents(f: MrzFields): ValidationError | null {
    const valid =
      this.documentCodes.includes(f.code.charAt(0)) &&
      /^[A-Z<]$/.test(f.code.charAt(1)) &&
      /^[A-Z<]{3}$/.test(f.issuer) &&
      /^[A-Z<]{3}$/.test(f.nationality) &&
      /^[A-Z][A-Z<]*$/.test(f.name) &&
      SEXES.includes(f.sex) &&
      AbstractMrz.validDate(f.birth, f.birthCheck) &&
      AbstractMrz.validDate(f.expiry, f.expiryCheck);
    return valid ? null : ValidationError.Component;
  }

  private static checkDigits(f: MrzFields): ValidationError | null {
    const valid =
      AbstractMrz.matches(f.number, f.numberCheck) &&
      AbstractMrz.dateMatches(f.birth, f.birthCheck) &&
      AbstractMrz.dateMatches(f.expiry, f.expiryCheck) &&
      (f.optionalCheck === null || AbstractMrz.optionalMatches(f.optional, f.optionalCheck)) &&
      AbstractMrz.matches(f.compositeData, f.compositeCheck);
    return valid ? null : ValidationError.Checksum;
  }

  private static matches(field: string, check: string): boolean {
    return String(AbstractMrz.checkDigit(field)) === check;
  }

  /** Con el campo vacío (todo `<`) el dígito puede ser `<` o `0`. */
  private static optionalMatches(field: string, check: string): boolean {
    return isFiller(field) ? check === '<' || check === '0' : AbstractMrz.matches(field, check);
  }

  /** Una fecha desconocida (`<<<<<<`) ya se validó en validDate(). */
  private static dateMatches(date: string, check: string): boolean {
    return date === UNKNOWN_DATE || AbstractMrz.matches(date, check);
  }

  /** Fecha AAMMDD válida, o desconocida (`<<<<<<` con dígito `<` o `0`). */
  private static validDate(date: string, check: string): boolean {
    if (date === UNKNOWN_DATE) {
      return check === '<' || check === '0';
    }
    return /^\d{6}$/.test(date) && isValidDate(2000, int(date.slice(2, 4)), int(date.slice(4, 6)));
  }
}

const cd = AbstractMrz.checkDigit;

/**
 * MRZ de cédula o tarjeta de identidad (TD1): 3 líneas de 30 caracteres. ICAO Doc 9303, parte 5.
 * Línea 1: tipo, emisor, número (6-14) y su dígito (15), datos opcionales (16-30).
 * Línea 2: nacimiento y su dígito, sexo, vencimiento y su dígito, nacionalidad, datos
 * opcionales (19-29) y el compuesto (30). Línea 3: nombre.
 * Si el número pasa de nueve caracteres, la posición 15 es `<` y continúa en los datos
 * opcionales de la línea 1, seguido de su dígito. Acepta también el tipo `P` de las
 * tarjetas pasaporte con este formato.
 */
export class Td1 extends AbstractMrz {
  protected override readonly pattern: RegExp = /^[A-Z0-9<]{90}$/;
  protected readonly documentCodes = 'ACIP';
  protected readonly lineLength = 30;
  protected readonly compositeAt = 59;

  protected fields(compact: string): MrzFields {
    const l1 = compact.slice(0, 30);
    const l2 = compact.slice(30, 60);
    const [number, numberCheck, optional1] = AbstractMrz.longNumber(l1.slice(5, 14), l1.charAt(14), l1.slice(15, 30));
    return {
      code: l1.slice(0, 2),
      issuer: l1.slice(2, 5),
      name: compact.slice(60, 90),
      number,
      numberCheck,
      nationality: l2.slice(15, 18),
      birth: l2.slice(0, 6),
      birthCheck: l2.charAt(6),
      sex: l2.charAt(7),
      expiry: l2.slice(8, 14),
      expiryCheck: l2.charAt(14),
      optional: optional1 + l2.slice(18, 29),
      optionalCheck: null,
      compositeCheck: l2.charAt(29),
      compositeData: l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29),
    };
  }

  protected draft(): string {
    const h = AbstractMrz.randomHolder();
    return (
      `I<UTO${h.number}${cd(h.number)}${pad('', 15)}` +
      `${h.birth}${cd(h.birth)}${h.sex}${h.expiry}${cd(h.expiry)}UTO${pad('', 11)}<` +
      pad(`${h.surname}<<${h.given}`, 30)
    );
  }
}

/**
 * MRZ de documento de identidad TD2: 2 líneas de 36 caracteres. ICAO Doc 9303, parte 6.
 * Línea 2: número (1-9) y su dígito, nacionalidad, nacimiento y su dígito, sexo,
 * vencimiento y su dígito, datos opcionales (29-35) y el compuesto (36).
 * Si el número pasa de nueve caracteres, la posición 10 es `<` y continúa en los datos
 * opcionales, seguido de su dígito.
 */
export class Td2 extends AbstractMrz {
  protected override readonly pattern: RegExp = /^[A-Z0-9<]{72}$/;
  protected readonly documentCodes = 'ACI';
  protected readonly lineLength = 36;
  protected readonly compositeAt = 71;

  protected fields(compact: string): MrzFields {
    const l1 = compact.slice(0, 36);
    const l2 = compact.slice(36, 72);
    const [number, numberCheck, optional] = AbstractMrz.longNumber(l2.slice(0, 9), l2.charAt(9), l2.slice(28, 35));
    return {
      code: l1.slice(0, 2),
      issuer: l1.slice(2, 5),
      name: l1.slice(5),
      number,
      numberCheck,
      nationality: l2.slice(10, 13),
      birth: l2.slice(13, 19),
      birthCheck: l2.charAt(19),
      sex: l2.charAt(20),
      expiry: l2.slice(21, 27),
      expiryCheck: l2.charAt(27),
      optional,
      optionalCheck: null,
      compositeCheck: l2.charAt(35),
      compositeData: l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 35),
    };
  }

  protected draft(): string {
    const h = AbstractMrz.randomHolder();
    return (
      pad(`I<UTO${h.surname}<<${h.given}`, 36) +
      `${h.number}${cd(h.number)}UTO${h.birth}${cd(h.birth)}${h.sex}${h.expiry}${cd(h.expiry)}` +
      `${pad('', 7)}<`
    );
  }
}

/**
 * MRZ de pasaporte (TD3): 2 líneas de 44 caracteres. ICAO Doc 9303, parte 4.
 * Línea 2: número (1-9) y su dígito, nacionalidad, nacimiento y su dígito, sexo,
 * vencimiento y su dígito, datos opcionales (29-42) con su dígito (43) y el compuesto (44).
 */
export class Td3 extends AbstractMrz {
  protected override readonly pattern: RegExp = /^[A-Z0-9<]{88}$/;
  protected readonly documentCodes = 'P';
  protected readonly lineLength = 44;
  protected readonly compositeAt = 87;

  protected fields(compact: string): MrzFields {
    const l1 = compact.slice(0, 44);
    const l2 = compact.slice(44, 88);
    return {
      code: l1.slice(0, 2),
      issuer: l1.slice(2, 5),
      name: l1.slice(5),
      number: l2.slice(0, 9),
      numberCheck: l2.charAt(9),
      nationality: l2.slice(10, 13),
      birth: l2.slice(13, 19),
      birthCheck: l2.charAt(19),
      sex: l2.charAt(20),
      expiry: l2.slice(21, 27),
      expiryCheck: l2.charAt(27),
      optional: l2.slice(28, 42),
      optionalCheck: l2.charAt(42),
      compositeCheck: l2.charAt(43),
      compositeData: l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43),
    };
  }

  protected draft(): string {
    const h = AbstractMrz.randomHolder();
    const optional = randomInt(0, 1) === 1 ? pad(randomDigits(9), 14) : pad('', 14);
    const optionalCheck = isFiller(optional) ? '<' : String(cd(optional));
    return (
      pad(`P<UTO${h.surname}<<${h.given}`, 44) +
      `${h.number}${cd(h.number)}UTO${h.birth}${cd(h.birth)}${h.sex}${h.expiry}${cd(h.expiry)}` +
      `${optional}${optionalCheck}<`
    );
  }
}
