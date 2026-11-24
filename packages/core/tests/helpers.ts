import { describe, expect, it } from 'vitest';
import { type Document, ValidationError } from '../src';

export interface Cases {
  validos: Record<string, string> | string[];
  invalidos: Record<string, string> | string[];
  /** número de entrada => formato esperado */
  formatos?: Array<[string, string]>;
}

const entries = (c: Record<string, string> | string[]): Array<[string, string]> =>
  Array.isArray(c) ? c.map((n) => [n, n]) : Object.entries(c);

const ERRORS = Object.values(ValidationError) as string[];

/** Equivalente de DocumentTestCase: las mismas propiedades para cada documento. */
export function documentSuite(name: string, make: () => Document, cases: Cases): void {
  const validos = entries(cases.validos);
  const invalidos = entries(cases.invalidos);

  describe(name, () => {
    it.each(validos)('acepta %s', (_label, n) => {
      expect(make().isValid(n)).toBe(true);
      const result = make().validate(n);
      expect(result.isValid()).toBe(true);
      expect(result.error).toBeNull();
    });

    it.each(invalidos)('rechaza %s', (_label, n) => {
      expect(make().isValid(n)).toBe(false);
      const result = make().validate(n);
      expect(result.isValid()).toBe(false);
      expect(ERRORS).toContain(result.error);
      // format y compact no lanzan con números inválidos
      make().format(n);
      make().compact(n);
    });

    it.each(validos)('ignora espacios, mayúsculas y conserva validez al formatear: %s', (_label, n) => {
      const doc = make();
      expect(doc.isValid(` \t${n}\n `)).toBe(true);
      expect(doc.isValid(n.toLowerCase())).toBe(true);
      expect(doc.isValid(doc.format(n))).toBe(true);
      expect(doc.format(doc.format(n))).toBe(doc.format(n));
      expect(doc.compact(doc.compact(n))).toBe(doc.compact(n));
    });

    it.each(validos)('rechaza separadores no soportados: %s', (_label, n) => {
      const doc = make();
      const compact = doc.compact(n);
      for (const sep of ['.', '/', '_']) {
        expect(doc.isValid(compact.slice(0, 1) + sep + compact.slice(1)), sep).toBe(false);
      }
    });

    if (cases.formatos) {
      it.each(cases.formatos)('formatea %s como %s', (input, expected) => {
        const doc = make();
        expect(doc.format(input)).toBe(expected);
        expect(doc.compact(expected)).toBe(doc.compact(input));
      });
    }
  });
}

export const replaceAt = (s: string, i: number, c: string): string => s.slice(0, i) + c + s.slice(i + 1);
