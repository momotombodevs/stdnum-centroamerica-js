import { HondurasGeografia } from '../../data/honduras-geografia';
import { type GeneratesNumbers, type ParsesNumbers, ValidationError } from '../../types';
import { int, randomDigits, randomInt, zeroPad } from '../../utils';
import { AbstractDocument } from '../abstract-document';

const SPECIAL_CODES: readonly string[] = HondurasGeografia.SPECIAL_CODES;

/** Componentes de un número de identidad válido. */
export class IdentidadData {
  constructor(
    /** Departamento 1-18; null con un código especial. */
    readonly departmentCode: number | null,
    /** Municipio dentro del departamento; null con un código especial. */
    readonly municipalityCode: number | null,
    /** Año de inscripción (en los naturalizados, el del acuerdo). */
    readonly registrationYear: number,
    readonly sequence: string,
    /** `0880` (doble nacionalidad) o `0890` (naturalizados). */
    readonly specialCode: string | null,
  ) {}
}

/**
 * Número de identidad (RNP): 13 dígitos, 0000-0000-00000.
 * Departamento (2) + municipio (2) + año de inscripción (4) + correlativo (5).
 *
 * Valida departamento 01-18, municipio dentro de la cantidad real del departamento
 * y año de inscripción no futuro. Acepta los códigos especiales oficiales 0880
 * (doble nacionalidad) y 0890 (naturalizados; el año es el del acuerdo).
 * No hay dígito verificador. Nivel: formato + geografía.
 */
export class Identidad extends AbstractDocument implements GeneratesNumbers, ParsesNumbers<IdentidadData> {
  protected override readonly pattern: RegExp = /^\d{13}$/;

  protected override checkContent(compact: string): ValidationError | null {
    const { departmentCode, municipalityCode, registrationYear } = Identidad.split(compact);
    if (registrationYear < 1800 || registrationYear > new Date().getFullYear()) {
      return ValidationError.Component;
    }
    if (departmentCode === null || municipalityCode === null) {
      return null; // código especial: no indica un lugar
    }
    const municipalities = HondurasGeografia.MUNICIPIOS_POR_DEPARTAMENTO[departmentCode] ?? 0;
    return municipalityCode >= 1 && municipalityCode <= municipalities ? null : ValidationError.Component;
  }

  generate(): string {
    const department = randomInt(1, 18);
    const municipality = randomInt(1, HondurasGeografia.MUNICIPIOS_POR_DEPARTAMENTO[department] as number);
    return zeroPad(department, 2) + zeroPad(municipality, 2) + zeroPad(randomInt(1950, 2005), 4) + randomDigits(5);
  }

  parse(number: string): IdentidadData | null {
    const compact = this.validated(number);
    if (compact === null) {
      return null;
    }
    return Identidad.split(compact);
  }

  /** Lee los componentes de un número compacto de 13 dígitos. */
  private static split(compact: string): IdentidadData {
    const code = compact.slice(0, 4);
    const year = int(compact.slice(4, 8));
    const sequence = compact.slice(8, 13);
    if (SPECIAL_CODES.includes(code)) {
      return new IdentidadData(null, null, year, sequence, code);
    }
    return new IdentidadData(int(code.slice(0, 2)), int(code.slice(2, 4)), year, sequence, null);
  }

  override format(number: string): string {
    return this.group(number, [4, 4, 5]);
  }
}

/** RTN (SAR): 14 dígitos; en personas naturales es el número de identidad + 1 dígito. Nivel: formato. */
export class Rtn extends AbstractDocument implements GeneratesNumbers {
  protected override readonly pattern: RegExp = /^\d{14}$/;

  generate(): string {
    return randomDigits(14);
  }
}
