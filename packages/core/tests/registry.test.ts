import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CostaRica,
  Guatemala,
  InvalidArgumentError,
  isDocument,
  isParser,
  Level,
  Nicaragua,
  Panama,
  Registry,
  Td3,
  ValidationError,
  ValidationResult,
  type Document,
} from '../src';
import { replaceAt } from './helpers';

const TD3 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';
const TD1 = 'I<UTOD231458907<<<<<<<<<<<<<<<7408122F1204159UTO<<<<<<<<<<<6ERIKSSON<<ANNA<MARIA<<<<<<<<<<';
const TD2 = 'I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<D231458907UTO7408122F1204159<<<<<<<6';
const DIGITS = '0123456789';
const KEYS = Registry.describe().map((d) => d.key);

class SinGenerador implements Document {
  isValid(): boolean {
    return true;
  }
  validate(): ValidationResult {
    return new ValidationResult();
  }
  format(n: string): string {
    return n;
  }
  compact(n: string): string {
    return n;
  }
}

describe('Registry', () => {
  it('resuelve documentos por clave, sin distinguir mayúsculas', () => {
    expect(Registry.make('GT.NIT')).toBeInstanceOf(Guatemala.Nit);
    expect(Registry.isValid('sv.dui', '12345678-4')).toBe(true);
    expect(Registry.isValid('sv.dui', '12345678-5')).toBe(false);
    expect(Registry.isValid('pa.cedula', '8-926-1601')).toBe(true);
  });

  it('todas las claves se pueden instanciar', () => {
    for (const key of Registry.keys()) {
      expect(isDocument(Registry.make(key)), key).toBe(true);
    }
  });

  it('las opciones llegan al constructor del documento', () => {
    // 001-010190-0001A tiene letra incorrecta (la correcta es N).
    expect(Registry.isValid('ni.cedula', '001-010190-0001A')).toBe(true);
    expect(Registry.isValid('ni.cedula', '001-010190-0001A', { strictLetter: true })).toBe(false);
    expect(Registry.isValid('ni.cedula', '282-010190-0001N', { strictMunicipality: true })).toBe(false);
    expect(Registry.isValid('ni.ruc', '001-010190-0001A', { strictLetter: true })).toBe(false);
  });

  it('describe lista los documentos incluidos', () => {
    const info = Registry.describe();
    expect(info).toHaveLength(18);
    expect(info[0]).toEqual({ key: 'gt.nit', country: 'GT', name: 'NIT', level: Level.Complete });
  });

  it('describe coincide con la tabla del README', () => {
    const countries: Record<string, string> = {
      GT: 'Guatemala',
      SV: 'El Salvador',
      HN: 'Honduras',
      NI: 'Nicaragua',
      CR: 'Costa Rica',
      PA: 'Panamá',
      ICAO: 'Internacional',
    };
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const expected: Record<string, [string, string, Level]> = {};
    for (const [, country, name, key, level] of readme.matchAll(
      /^\| ([^|]+) \| ([^|]+) \| `([a-z]+\.[a-z0-9_]+)` \| (completa|formato)/gm,
    )) {
      expected[key as string] = [country as string, name as string, level === 'completa' ? Level.Complete : Level.Format];
    }
    const actual: Record<string, [string, string, Level]> = {};
    for (const d of Registry.describe()) {
      actual[d.key] = [countries[d.country] as string, d.name, d.level];
    }
    expect(actual).toEqual(expected);
  });

  it('clave desconocida lanza InvalidArgumentError', () => {
    expect(() => Registry.make('xx.nada')).toThrow(InvalidArgumentError);
    expect(() => Registry.isValid('xx.nada', '1')).toThrow(/no soportado/);
  });

  it('register reemplaza un documento y exige la interfaz', () => {
    Registry.register('XX.NITE', CostaRica.Nite);
    expect(Registry.make('xx.nite')).toBeInstanceOf(CostaRica.Nite);
    expect(Registry.keys()).toContain('xx.nite');
    expect(Registry.describe().map((d) => d.key)).not.toContain('xx.nite');
    expect(() => Registry.register('xx.mal', class {} as never)).toThrow(InvalidArgumentError);
    expect(() => Registry.register('xx.mal', 'nada' as never)).toThrow(InvalidArgumentError);
    expect(() =>
      Registry.register('xx.mal', class {
        constructor() {
          throw new Error('x');
        }
      } as never),
    ).toThrow(InvalidArgumentError);
  });

  it('un documento sin generador lanza al generar y sin parse lanza al leer', () => {
    Registry.register('xx.sin_generador', SinGenerador);
    expect(() => Registry.generate('xx.sin_generador')).toThrow(InvalidArgumentError);
    expect(() => Registry.parse('gt.nit', '1234567-9')).toThrow(InvalidArgumentError);
  });
});

describe('validate() reporta el motivo del fallo', () => {
  it.each([
    ['gt.nit', '', ValidationError.Format],
    ['gt.nit', '1234567-0', ValidationError.Checksum],
    ['gt.dpi', '2000 0000 A 0101', ValidationError.Format],
    ['gt.dpi', '2000000000023', ValidationError.Component],
    ['sv.dui', '00000000-1', ValidationError.Checksum],
    ['sv.nit', '12345', ValidationError.Format],
    ['sv.nit', '00000000-1', ValidationError.Checksum],
    ['hn.identidad', '0801-1990', ValidationError.Format],
    ['hn.identidad', '0899199000001', ValidationError.Component],
    ['ni.cedula', '001-010190-00001', ValidationError.Format],
    ['ni.cedula', '001-320190-0001N', ValidationError.Component],
    ['ni.ruc', '0000300766011M', ValidationError.Component],
    ['ni.ruc', 'X', ValidationError.Format],
    ['pa.cedula', 'ABC', ValidationError.Format],
    ['pa.ruc', '1', ValidationError.Format],
    ['cr.dimex', '0123', ValidationError.Format],
  ] as const)('%s %s => %s', (key, n, expected) => {
    const result = Registry.validate(key, n);
    expect(result.isValid()).toBe(false);
    expect(result.error).toBe(expected);
  });

  it('acepta opciones', () => {
    expect(Registry.validate('ni.cedula', '001-010190-0001A').error).toBeNull();
    expect(Registry.validate('ni.cedula', '001-010190-0001A', { strictLetter: true }).error).toBe(
      ValidationError.Checksum,
    );
  });
});

describe('cambiar un carácter protegido por el verificador invalida el número', () => {
  it.each([
    ['gt.nit', '36029785', [0, 1, 2, 3, 4, 5, 6], DIGITS],
    ['gt.nit', '36029785', [7], `${DIGITS}K`],
    ['gt.dpi', '1234567890101', [0, 1, 2, 3, 4, 5, 6, 7], DIGITS],
    ['gt.dpi', '1234567890101', [8], DIGITS],
    ['sv.dui', '123456784', [8], DIGITS],
    ['sv.nit', '06141303861364', [13], DIGITS],
    ['sv.nit', '07162002610014', [13], DIGITS],
    ['mrz.td3', TD3, [57, 58, 59, 60, 61, 62, 63], DIGITS],
    ['mrz.td3', TD3, [65, 66, 67, 68, 69, 70, 71], DIGITS],
    ['mrz.td3', TD3, [53, 63, 71, 86, 87], DIGITS],
    ['mrz.td1', TD1, [30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 59], DIGITS],
    ['mrz.td2', TD2, [49, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60, 61, 62, 63, 71], DIGITS],
    ['ni.cedula', '0010101900001N', [13], 'ABCDEFGHJKLMNPQRSTUVWXY'],
  ] as const)('%s %s', (key, number, positions, alphabet) => {
    // La letra de la cédula nicaragüense solo se comprueba en modo estricto.
    const options = key === 'ni.cedula' ? { strictLetter: true } : {};
    expect(Registry.isValid(key, number, options)).toBe(true);
    for (const position of positions) {
      for (const replacement of alphabet) {
        if (replacement === number.charAt(position)) continue;
        const mutated = replaceAt(number, position, replacement);
        expect(Registry.isValid(key, mutated, options), mutated).toBe(false);
      }
    }
  });
});

describe('generate()', () => {
  it.each(KEYS)('%s genera números válidos y variados', (key) => {
    const doc = Registry.make(key);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const n = Registry.generate(key);
      expect(doc.isValid(n), `${key} generó ${n}`).toBe(true);
      seen.add(n);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('los verificadores coinciden con un cálculo independiente', () => {
    for (let i = 0; i < 200; i++) {
      const dui = Registry.generate('sv.dui');
      let sum = 0;
      for (let p = 0; p < 8; p++) sum += Number(dui[p]) * (9 - p);
      expect(Number(dui[8]), dui).toBe((10 - (sum % 10)) % 10);

      const dpi = Registry.generate('gt.dpi');
      sum = 0;
      for (let p = 0; p < 8; p++) sum += Number(dpi[p]) * (p + 2);
      expect(Number(dpi[8]), dpi).toBe(sum % 11);

      const nit = Registry.generate('gt.nit');
      const body = nit.slice(0, -1);
      sum = 0;
      for (let p = 0; p < body.length; p++) sum += Number(body[body.length - 1 - p]) * (p + 2);
      const check = (11 - (sum % 11)) % 11;
      expect(nit.slice(-1), nit).toBe(check === 10 ? 'K' : String(check));
    }
  });

  it('los números generados se pueden leer', () => {
    for (const key of KEYS) {
      if (!isParser(Registry.make(key))) continue;
      for (let i = 0; i < 100; i++) {
        expect(Registry.parse(key, Registry.generate(key)), key).not.toBeNull();
      }
    }
  });
});

describe('parse()', () => {
  it('cédula de Nicaragua', () => {
    const data = Registry.parse('ni.cedula', '001-010190-0001n');
    expect(data).toBeInstanceOf(Nicaragua.CedulaData);
    expect(data).toMatchObject({
      municipalityCode: 1,
      birthDay: 1,
      birthMonth: 1,
      birthYearTwoDigits: 90,
      sequence: '0001',
      letter: 'N',
    });
    expect(data?.isBornAbroad()).toBe(false);
  });

  it('el siglo de la cédula se ofrece como candidatos', () => {
    const data = Registry.parse('ni.cedula', '001-010190-0001N');
    expect(data?.birthYearCandidates('20261020')).toEqual([1990]);
    expect(data?.birthYearCandidates('21001231')).toEqual([1990, 2090]);
    expect(data?.birthYearCandidates()).toContain(1990);
    const recent = Registry.parse('ni.cedula', '001-150620-0001A');
    expect(recent?.birthYearCandidates('20261020')).toEqual([1920, 2020]);
    expect(recent?.birthYearCandidates('20200101')).toEqual([1920]);
    expect(recent?.birthYearCandidates('20200615')).toEqual([1920, 2020]);
  });

  it('los candidatos pueden quedar vacíos y el 29 de febrero descarta años no bisiestos', () => {
    expect(Registry.parse('ni.cedula', '001-290201-0001A')?.birthYearCandidates('20261020')).toEqual([]);
    expect(Registry.parse('ni.cedula', '001-290200-0001A')?.birthYearCandidates('20261020')).toEqual([2000]);
  });

  it('la cédula respeta strictMunicipality', () => {
    expect(Registry.parse('ni.cedula', '282-010190-0001A')).not.toBeNull();
    expect(Registry.parse('ni.cedula', '282-010190-0001A', { strictMunicipality: true })).toBeNull();
  });

  it('cédula de Nicaragua de nacido en el extranjero', () => {
    const digits = '8880101900001';
    const data = Registry.parse('ni.cedula', digits + Nicaragua.Cedula.checkLetter(digits));
    expect(data?.municipalityCode).toBe(888);
    expect(data?.isBornAbroad()).toBe(true);
  });

  it('identidad de Honduras', () => {
    expect(Registry.parse('hn.identidad', '0906-1990-00001')).toEqual({
      departmentCode: 9,
      municipalityCode: 6,
      registrationYear: 1990,
      sequence: '00001',
      specialCode: null,
    });
    expect(Registry.parse('hn.identidad', '0890-2010-00012')).toEqual({
      departmentCode: null,
      municipalityCode: null,
      registrationYear: 2010,
      sequence: '00012',
      specialCode: '0890',
    });
  });

  it('DPI de Guatemala', () => {
    const data = Registry.parse('gt.dpi', '1234 56789 0101');
    expect(data).toBeInstanceOf(Guatemala.DpiData);
    expect(data).toEqual({ serial: '12345678', departmentCode: 1, municipalityCode: 1 });
  });

  it('cédula de Panamá', () => {
    const { CedulaData, CedulaKind } = Panama;
    expect(Registry.parse('pa.cedula', '8-926-1601')).toEqual(new CedulaData(CedulaKind.Birth, 8, null, '926', '1601'));
    expect(Registry.parse('pa.cedula', 'pe 5 687')).toEqual(new CedulaData(CedulaKind.BornAbroad, null, null, '5', '687'));
    expect(Registry.parse('pa.cedula', 'N-19-473')).toEqual(new CedulaData(CedulaKind.Naturalized, null, null, '19', '473'));
    expect(Registry.parse('pa.cedula', 'E-8-12345')).toEqual(
      new CedulaData(CedulaKind.ForeignResident, 8, null, null, '12345'),
    );
    expect(Registry.parse('pa.cedula', '3-PI-12-345')).toEqual(new CedulaData(CedulaKind.Birth, 3, 'PI', '12', '345'));
  });

  it('MRZ de pasaporte', () => {
    const data = Registry.parse('mrz.td3', TD3);
    expect(data).toBeInstanceOf(new Td3().parse(TD3)?.constructor as never);
    expect(data?.surname).toBe('ERIKSSON');
    expect(data?.documentNumber).toBe('L898902C3');
    expect(Registry.parse('mrz.td3', 'P<UTO')).toBeNull();
  });

  it('un número inválido devuelve null', () => {
    expect(Registry.parse('ni.cedula', '001-010190-0001A', { strictLetter: true })).toBeNull();
    expect(Registry.parse('hn.identidad', '0899-1990-00001')).toBeNull();
    expect(Registry.parse('gt.dpi', '1234567880101')).toBeNull();
    expect(Registry.parse('pa.cedula', 'ABC')).toBeNull();
  });
});

describe('ejemplo del README: documento propio', () => {
  it('extiende AbstractDocument y se registra', async () => {
    const { AbstractDocument } = await import('../src');
    class CodigoPostal extends AbstractDocument {
      protected override readonly pattern = /^\d{5}$/;
    }
    Registry.register('xx.codigo_postal', CodigoPostal);
    expect(Registry.isValid('xx.codigo_postal', '12345')).toBe(true);
    expect(Registry.isValid('xx.codigo_postal', '1234')).toBe(false);
    expect(Registry.make('xx.codigo_postal').format('123 45')).toBe('12345');
  });
});
