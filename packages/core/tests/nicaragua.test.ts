import { describe, expect, it } from 'vitest';
import { Nicaragua, NicaraguaMunicipios, ValidationError } from '../src';

const { Cedula, Ruc } = Nicaragua;

describe('ni.cedula', () => {
  it.each(['001-010190-0001N', '0010101900001n', '001-251075-0012S', '2811505850001R', '6010101900001X'])(
    'acepta %s',
    (n) => expect(new Cedula().isValid(n)).toBe(true),
  );

  it.each([
    ['mes 13', '001-011390-0001N'],
    ['día 32', '001-320190-0001N'],
    ['municipio 000', '000-010190-0001V'],
    ['municipio fuera de rango', '641-010190-0001T'],
    ['sin letra', '001-010190-0001'],
    ['corta', '123'],
  ])('rechaza: %s', (_label, n) => expect(new Cedula().isValid(n)).toBe(false));

  it('formatea y compacta', () => {
    const doc = new Cedula();
    expect(doc.format('0010101900001n')).toBe('001-010190-0001N');
    expect(doc.compact('001-010190-0001n')).toBe('0010101900001N');
  });

  it('la letra se calcula con módulo 23', () => {
    expect(Cedula.checkLetter('0012510750012')).toBe('S');
  });

  it('modo estricto de letra', () => {
    const strict = new Cedula({ strictLetter: true });
    const lenient = new Cedula();
    expect(strict.isValid('001-251075-0012S')).toBe(true);
    expect(strict.isValid('001-251075-0012A')).toBe(false);
    expect(lenient.isValid('001-251075-0012A')).toBe(true);
    // Ejemplo del aviso DGI AVISO/072/05-2022: no cumple el módulo 23.
    expect(strict.isValid('0013007660022M')).toBe(false);
    expect(lenient.isValid('0013007660022M')).toBe(true);
  });

  it('la letra incorrecta se acepta por defecto', () => {
    expect(new Cedula().isValid('001-010190-0001A')).toBe(true);
    expect(new Cedula().isValid('001-010190-0001')).toBe(false);
    expect(new Cedula({ strictLetter: true }).validate('001-010190-0001A').error).toBe(ValidationError.Checksum);
  });

  it('modo estricto de municipio', () => {
    // 282 está en el bloque de León pero es un código sin asignar en la lista conocida.
    const n = `282-010190-0001${Cedula.checkLetter('2820101900001')}`;
    expect(new Cedula().isValid(n)).toBe(true);
    expect(new Cedula({ strictMunicipality: true }).isValid(n)).toBe(false);
    expect(new Cedula({ strictMunicipality: true }).isValid('001-010190-0001N')).toBe(true);
  });

  it('código 888 de nacidos en el extranjero', () => {
    const n = `888-010190-0001${Cedula.checkLetter('8880101900001')}`;
    expect(new Cedula().isValid(n)).toBe(true);
    expect(new Cedula({ strictMunicipality: true }).isValid(n)).toBe(true);
    expect(new Cedula().isValid(`887-010190-0001${Cedula.checkLetter('8870101900001')}`)).toBe(false);
  });

  it('cédula de muestra con MRZ consistente', () => {
    // Infografía de la cédula: 041 = Jinotepe, fecha 21-04-1994, número de producción 0000.
    expect(Cedula.checkLetter('0412104940000')).toBe('Y');
    expect(new Cedula({ strictMunicipality: true }).isValid('041-210494-0000Y')).toBe(true);
  });

  it('la lista de municipios conocidos tiene 152 códigos', () => {
    expect(NicaraguaMunicipios.CODES).toHaveLength(152);
  });

  it('acepta todos los municipios y cualquier letra por defecto', () => {
    const doc = new Cedula();
    const ruc = new Ruc();
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let m = 1; m <= 641; m++) {
      const code = m === 641 ? 888 : m;
      const n = `${String(code).padStart(3, '0')}150690000${code % 10}${letters.charAt(code % 26)}`;
      expect(doc.isValid(n), n).toBe(true);
      expect(doc.isValid(n.toLowerCase()), n).toBe(true);
      expect(ruc.isValid(n), n).toBe(true);
    }
  });
});

describe('ni.ruc', () => {
  it.each([
    'J0310000000001',
    'N0010101900001',
    '001-010190-0001N',
    // Ejemplos del aviso DGI AVISO/072/05-2022
    'N0000000000019',
    'R1230003007661',
    'E1230003007661',
    'J0310000007669',
  ])('acepta %s', (n) => expect(new Ruc().isValid(n)).toBe(true));

  it.each(['K0310000000001', 'J031000000000', '123', '0000300766011M'])('rechaza %s', (n) =>
    expect(new Ruc().isValid(n)).toBe(false),
  );

  it('formatea y compacta', () => {
    const doc = new Ruc();
    expect(doc.format('J0310000000001')).toBe('J0310000000001');
    expect(doc.compact('J0310000000001')).toBe('J0310000000001');
    expect(doc.format('0010101900001n')).toBe('001-010190-0001N');
  });

  it('la letra de cédula incorrecta solo falla en modo estricto', () => {
    expect(new Ruc().isValid('001-010190-0001A')).toBe(true);
    expect(new Ruc({ cedula: new Cedula({ strictLetter: true }) }).isValid('001-010190-0001A')).toBe(false);
    expect(new Ruc({ strictLetter: true }).isValid('001-010190-0001A')).toBe(false);
  });
});
