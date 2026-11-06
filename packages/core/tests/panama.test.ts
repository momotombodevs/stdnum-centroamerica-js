import { describe, expect, it } from 'vitest';
import { Panama } from '../src';

const { Cedula, Ruc } = Panama;

describe('pa.cedula', () => {
  it.each([
    // Ejemplos del Decreto 53 de 1958 según la página del Tribunal Electoral
    ['nacimiento', '8-926-1601'],
    ['nacido en el extranjero', 'PE-5-687'],
    ['naturalizado', 'N-19-473'],
    ['extranjero domiciliado', 'E-8-12345'],
    ['provincia 1', '1-1-1'],
    ['provincia 9', '9-100-12345'],
    ['minúsculas y espacios', 'pe 5 687'],
    // No oficial: claves 10-13 y sufijos PI / AV
    ['comarca', '12-12-345'],
    ['indígena', '3-PI-12-345'],
    ['anterior al registro civil', '8-AV-12-345'],
  ])('acepta: %s', (_label, n) => expect(new Cedula().isValid(n)).toBe(true));

  it.each([
    ['provincia 0', '0-926-1601'],
    ['provincia 14', '14-926-1601'],
    ['sin asiento', '8-926'],
    ['letras en tomo', '8-A26-1601'],
    ['prefijo desconocido', 'XX-5-687'],
    ['PE con provincia', 'PE-8-5-687'],
    ['N sin asiento', 'N-19'],
    ['sin separadores', '89261601'],
    ['vacío', ''],
  ])('rechaza: %s', (_label, n) => expect(new Cedula().isValid(n)).toBe(false));

  it('formatea con guiones y compacta sin ellos', () => {
    const doc = new Cedula();
    expect(doc.format(' 8 926  1601 ')).toBe('8-926-1601');
    expect(doc.format('pe-5-687')).toBe('PE-5-687');
    expect(doc.format('8--926-1601')).toBe('8-926-1601');
    // compact() quita los separadores, como en el resto del paquete (pierde tomo/asiento).
    expect(doc.compact('8-926-1601')).toBe('89261601');
  });
});

describe('pa.ruc', () => {
  it.each([
    // Ejemplos de la ficha técnica de factura electrónica de la DGI
    ['NT, ficha técnica', '8-NT-000-00'],
    ['PE, ficha técnica', 'PE-4-000-000'],
    ['jurídica, ficha técnica', '00023824-0930-212623'],
    ['PE con letra en medio, ejemplo CUFE', '8-PE-3824-523'],
    ['cédula', '8-926-1601'],
    ['cédula de naturalizado', 'N-19-473'],
    ['NT, guía de terceros', '3-NT-3-33'],
    ['jurídica', '155612345-2-2015'],
  ])('acepta: %s', (_label, n) => expect(new Ruc().isValid(n)).toBe(true));

  it.each([
    ['NT sin tomo', '8-NT-000'],
    ['NT con provincia 14', '14-NT-1-1'],
    ['dos grupos numéricos', '123-456'],
    ['demasiado corto', '1-1'],
    ['demasiado largo', '12345678901-1234567-12345678'],
    ['letras sueltas', 'ABCDE'],
    ['vacío', ''],
  ])('rechaza: %s', (_label, n) => expect(new Ruc().isValid(n)).toBe(false));

  it('compacta y formatea', () => {
    const doc = new Ruc();
    expect(doc.format('8 nt 000 00')).toBe('8-NT-000-00');
    expect(doc.format('00023824 0930 212623')).toBe('00023824-0930-212623');
  });
});
