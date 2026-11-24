import { type Document, ValidationError, ValidationResult } from '../types';

const SEPARATORS = /[ \t\n\r\f\v-]/g;

export abstract class AbstractDocument implements Document {
  /** Expresión que debe cumplir el número compacto; la usa el check() por defecto. */
  protected readonly pattern: RegExp = /^$/;

  isValid(number: string): boolean {
    return this.validate(number).isValid();
  }

  validate(number: string): ValidationResult {
    return new ValidationResult(this.check(this.prepare(String(number))));
  }

  compact(number: string): string {
    return String(number).replace(SEPARATORS, '').toUpperCase();
  }

  /** Sin agrupación propia, el formato es el número compacto. */
  format(number: string): string {
    return this.compact(number);
  }

  /** La forma validada del número, o null si no es válido: punto de partida de parse(). */
  protected validated(number: string): string | null {
    const prepared = this.prepare(String(number));
    return this.check(prepared) === null ? prepared : null;
  }

  /** Forma sobre la que se valida; por defecto la compacta. Panamá conserva los guiones. */
  protected prepare(number: string): string {
    return this.compact(number);
  }

  /**
   * Primer error de un número compacto, o null si es válido. Por defecto exige `pattern` y
   * luego las reglas de checkContent(); los documentos sin `pattern` lo sobrescriben.
   */
  protected check(compact: string): ValidationError | null {
    return this.pattern.test(compact) ? this.checkContent(compact) : ValidationError.Format;
  }

  /** Reglas adicionales (componentes, verificador) de un número que ya cumple `pattern`. */
  protected checkContent(_compact: string): ValidationError | null {
    return null;
  }

  /**
   * Agrupa el número compacto según los tamaños dados; si la longitud no coincide,
   * devuelve el número compacto sin cambios.
   */
  protected group(number: string, sizes: readonly number[], separator = '-'): string {
    const compact = this.compact(number);
    if (compact.length !== sizes.reduce((a, b) => a + b, 0)) {
      return compact;
    }
    const parts: string[] = [];
    let offset = 0;
    for (const size of sizes) {
      parts.push(compact.slice(offset, offset + size));
      offset += size;
    }
    return parts.join(separator);
  }

  /** Separa con un guion el último carácter (verificador) del resto. */
  protected groupLast(number: string): string {
    const compact = this.compact(number);
    return compact.length < 2 ? compact : `${compact.slice(0, -1)}-${compact.slice(-1)}`;
  }
}
