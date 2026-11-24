import { NicaraguaMunicipios } from '../../data/nicaragua-municipios';
import { type GeneratesNumbers, type ParsesNumbers, ValidationError } from '../../types';
import { int, isValidDate, randomDigits, randomInt, randomItem, zeroPad } from '../../utils';
import { AbstractDocument } from '../abstract-document';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXY';

/** Fecha AAAAMMDD, comparable como texto. */
function ymd(year: number, month: number, day: number): string {
  return zeroPad(year, 4) + zeroPad(month, 2) + zeroPad(day, 2);
}

function today(): string {
  const now = new Date();
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Componentes de una cédula de Nicaragua. El municipio y la letra no se contrastan con el
 * CSE: su lista de códigos y la fórmula de la letra son de terceros.
 */
export class CedulaData {
  constructor(
    /** Código de municipio; 888 son nacidos en el extranjero (fuente única). */
    readonly municipalityCode: number,
    readonly birthDay: number,
    readonly birthMonth: number,
    /** Año de nacimiento con dos dígitos; el siglo no está en el número. */
    readonly birthYearTwoDigits: number,
    /** Consecutivo de cuatro dígitos. */
    readonly sequence: string,
    /** Letra de control tal como aparece. */
    readonly letter: string,
  ) {}

  /** Código 888: el número no indica un municipio. */
  isBornAbroad(): boolean {
    return this.municipalityCode === NicaraguaMunicipios.FOREIGN_CODE;
  }

  /**
   * Años de nacimiento posibles: 19AA o 20AA, sin los que dejarían la fecha en el futuro ni
   * los que no tienen ese día (29 de febrero en un año no bisiesto). Puede quedar vacía:
   * 29/02/01 no existe ni en 1901 ni en 2001.
   *
   * @param reference fecha de referencia AAAAMMDD; por defecto, hoy
   */
  birthYearCandidates(reference: string = today()): number[] {
    return [1900 + this.birthYearTwoDigits, 2000 + this.birthYearTwoDigits].filter(
      (year) =>
        isValidDate(year, this.birthMonth, this.birthDay) && ymd(year, this.birthMonth, this.birthDay) <= reference,
    );
  }
}

export interface CedulaOptions {
  /** Exige un código de municipio de la lista conocida (incompleta): puede rechazar cédulas válidas. */
  strictMunicipality?: boolean;
  /** Comprueba la letra de control (módulo 23, fórmula de fuentes no oficiales). */
  strictLetter?: boolean;
}

/**
 * Cédula de identidad (CSE): municipio (3) + fecha de nacimiento DDMMAA (6) +
 * consecutivo (4) + letra. Formato 000-000000-0000A. Ley 152, art. 31 define las
 * 13 cifras; no menciona la letra.
 *
 * Valida formato, fecha plausible, municipio en 001-640 (o 888, nacidos en el
 * extranjero) y, con `strictLetter`, la letra: 13 dígitos módulo 23 sobre
 * ABCDEFGHJKLMNPQRSTUVWXY. El CSE no publica la fórmula, así que por defecto solo se
 * exige que la letra tenga forma de letra.
 */
export class Cedula extends AbstractDocument implements GeneratesNumbers, ParsesNumbers<CedulaData> {
  protected override readonly pattern: RegExp = /^\d{13}[A-Z]$/;
  private readonly strictMunicipality: boolean;
  private readonly strictLetter: boolean;

  constructor(options: CedulaOptions = {}) {
    super();
    this.strictMunicipality = options.strictMunicipality ?? false;
    this.strictLetter = options.strictLetter ?? false;
  }

  protected override checkContent(compact: string): ValidationError | null {
    const data = Cedula.split(compact);
    if (!this.isKnownMunicipality(data.municipalityCode) || !isValidDate(2000, data.birthMonth, data.birthDay)) {
      return ValidationError.Component;
    }
    return !this.strictLetter || Cedula.checkLetter(compact.slice(0, 13)) === data.letter
      ? null
      : ValidationError.Checksum;
  }

  generate(): string {
    const municipality = randomItem(NicaraguaMunicipios.CODES);
    const digits =
      zeroPad(municipality, 3) +
      zeroPad(randomInt(1, 28), 2) +
      zeroPad(randomInt(1, 12), 2) +
      zeroPad(randomInt(0, 99), 2) +
      randomDigits(4);
    return digits + Cedula.checkLetter(digits);
  }

  parse(number: string): CedulaData | null {
    const compact = this.validated(number);
    if (compact === null) {
      return null;
    }
    return Cedula.split(compact);
  }

  /** Lee los componentes de una cédula compacta con forma válida. */
  private static split(compact: string): CedulaData {
    return new CedulaData(
      int(compact.slice(0, 3)),
      int(compact.slice(3, 5)),
      int(compact.slice(5, 7)),
      int(compact.slice(7, 9)),
      compact.slice(9, 13),
      compact.charAt(13),
    );
  }

  override format(number: string): string {
    return this.group(number, [3, 6, 5]);
  }

  /** Letra de control de los 13 dígitos (módulo 23). */
  static checkLetter(digits: string): string {
    return LETTERS.charAt(int(digits) % 23);
  }

  private isKnownMunicipality(code: number): boolean {
    if (code === NicaraguaMunicipios.FOREIGN_CODE) {
      return true;
    }
    return (
      code >= 1 &&
      code <= NicaraguaMunicipios.MAX_CODE &&
      (!this.strictMunicipality || NicaraguaMunicipios.CODES.includes(code))
    );
  }
}

export interface RucOptions extends CedulaOptions {
  /** Cédula con la que se validan los RUC de personas naturales; si se pasa, ignora las demás opciones. */
  cedula?: Cedula;
}

/**
 * RUC (DGI), 14 caracteres: personas jurídicas J + 13 dígitos; nacionales sin cédula
 * N, residentes extranjeros R, no residentes E (+ 13 dígitos); nacionales con cédula
 * usan el número de cédula. Los que inician con cuatro ceros no son válidos.
 * Fuente: DGI, AVISO/072/05-2022 (Disposición Administrativa General 01-2013).
 * Nivel: formato.
 */
export class Ruc extends AbstractDocument implements GeneratesNumbers {
  private readonly cedula: Cedula;

  constructor(options: RucOptions = {}) {
    super();
    this.cedula = options.cedula ?? new Cedula(options);
  }

  protected override check(compact: string): ValidationError | null {
    if (compact.startsWith('0000')) {
      return ValidationError.Component;
    }
    return /^[JNRE]\d{13}$/.test(compact) ? null : this.cedula.validate(compact).error;
  }

  generate(): string {
    return randomItem(['J', 'N', 'R', 'E']) + randomDigits(13);
  }

  override format(number: string): string {
    const compact = this.compact(number);
    return /^[JNRE]/.test(compact) ? compact : this.cedula.format(compact);
  }
}
