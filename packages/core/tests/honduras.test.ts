import { describe, expect, it } from 'vitest';
import { Honduras, HondurasGeografia } from '../src';
import { documentSuite } from './helpers';

const pad = (n: number, l = 2): string => String(n).padStart(l, '0');
const MUNICIPIOS = Object.entries(HondurasGeografia.MUNICIPIOS_POR_DEPARTAMENTO).map(
  ([d, c]) => [Number(d), c] as const,
);

documentSuite('hn.identidad', () => new Honduras.Identidad(), {
  validos: {
    a: '0801-1990-12345',
    b: '0801199012345',
    'La Ceiba': '0101-1985-00001',
    'último de Francisco Morazán': '0828-2000-00001',
    'Villeda Morales, Gracias a Dios (INE 09-06)': '0906-1990-00001',
    'San Francisco de Opalaca, Intibucá (INE 10-17)': '1017-1990-00001',
    'doble nacionalidad': '0880-2015-00001',
    naturalizado: '0890-2010-00012',
  },
  invalidos: {
    'departamento 00': '0001-1990-12345',
    'departamento 19': '1901-1990-12345',
    'municipio 00': '0800-1990-12345',
    'municipio 29 de Francisco Morazán': '0829-1990-12345',
    'Gracias a Dios sólo tiene 6': '0907-1990-00001',
    'Intibucá sólo tiene 17': '1018-1990-00001',
    'código 0881 no es especial': '0881-1990-12345',
    'año futuro': '0801-2999-12345',
    'año 1700': '0801-1700-12345',
    corta: '0801-1990-1234',
    letras: '0801-1990-1234A',
  },
  formatos: [['0801199012345', '0801-1990-12345']],
});

documentSuite('hn.rtn', () => new Honduras.Rtn(), {
  validos: ['0801-1990-123456', '08011990123456'],
  invalidos: ['0801-1990-12345', '0801-1990-12345A'],
  formatos: [['0801-1990-123456', '08011990123456']],
});

describe('Honduras', () => {
  it('hay 298 municipios en 18 departamentos', () => {
    expect(MUNICIPIOS).toHaveLength(18);
    expect(MUNICIPIOS.reduce((sum, [, c]) => sum + c, 0)).toBe(298);
  });

  it('el año de inscripción no puede ser futuro', () => {
    const next = new Date().getFullYear() + 1;
    expect(new Honduras.Identidad().isValid(`0801${next}12345`)).toBe(false);
    expect(new Honduras.Identidad().isValid(`0801${next - 1}12345`)).toBe(true);
  });

  it('primer y último municipio de cada departamento', () => {
    const doc = new Honduras.Identidad();
    for (const [department, count] of MUNICIPIOS) {
      expect(doc.isValid(`${pad(department)}01199012345`)).toBe(true);
      expect(doc.isValid(`${pad(department)}${pad(count)}199012345`)).toBe(true);
      expect(doc.isValid(`${pad(department)}${pad(count + 1)}199012345`)).toBe(false);
    }
  });

  it('acepta todos los departamentos y municipios', () => {
    const doc = new Honduras.Identidad();
    const rtn = new Honduras.Rtn();
    for (const [department, count] of MUNICIPIOS) {
      for (let m = 1; m <= count; m++) {
        const n = `${pad(department)}${pad(m)}198500001`;
        expect(doc.isValid(n), n).toBe(true);
        expect(rtn.isValid(`${n}7`), n).toBe(true);
      }
    }
  });
});
