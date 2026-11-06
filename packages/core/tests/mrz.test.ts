import { describe, expect, it } from 'vitest';
import { AbstractMrz, Td1, Td2, Td3, ValidationError } from '../src';
import { documentSuite, replaceAt } from './helpers';

const TD3 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
const TD1 = 'I<UTOD231458907<<<<<<<<<<<<<<<\n7408122F1204159UTO<<<<<<<<<<<6\nERIKSSON<<ANNA<MARIA<<<<<<<<<<';
const TD2 = 'I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<\nD231458907UTO7408122F1204159<<<<<<<6';
const oneLine = (s: string): string => s.replace(/\n/g, '');
const cd = AbstractMrz.checkDigit;

documentSuite('mrz.td1', () => new Td1(), {
  validos: {
    'ICAO, con saltos de línea': TD1,
    'ICAO, en una línea': oneLine(TD1),
    'tarjeta pasaporte (tipo P)': `P${TD1.slice(1)}`,
  },
  invalidos: {
    vacío: '',
    'líneas incompletas': TD1.slice(0, 40),
    'dígito del número': TD1.replace('D231458907', 'D231458908'),
    'dígito de nacimiento': TD1.replace('7408122F', '7408123F'),
    'dígito de vencimiento': TD1.replace('F1204159', 'F1204158'),
    'dígito compuesto': TD1.replace('<<<6\n', '<<<7\n'),
    'sexo inválido': TD1.replace('7408122F', '7408122Q'),
    'mes de nacimiento inválido': TD1.replace('7408122F', '7438122F'),
    'tipo de documento inválido': `Q${TD1.slice(1)}`,
  },
  formatos: [[oneLine(TD1), TD1]],
});

documentSuite('mrz.td2', () => new Td2(), {
  validos: { 'ICAO, con saltos de línea': TD2, 'ICAO, en una línea': oneLine(TD2) },
  invalidos: {
    vacío: '',
    'líneas incompletas': TD2.slice(0, 40),
    'dígito del número': TD2.replace('D231458907', 'D231458908'),
    'dígito de nacimiento': TD2.replace('7408122F', '7408123F'),
    'dígito de vencimiento': TD2.replace('F1204159', 'F1204158'),
    'dígito compuesto': TD2.replace(/6$/, '7'),
    'sexo inválido': TD2.replace('7408122F', '7408122Q'),
    'tipo de documento inválido': `P${TD2.slice(1)}`,
  },
  formatos: [[oneLine(TD2), TD2]],
});

documentSuite('mrz.td3', () => new Td3(), {
  validos: {
    'ICAO, con saltos de línea': TD3,
    'ICAO, en una línea': oneLine(TD3),
    'ICAO, en minúsculas': TD3.toLowerCase(),
    'sexo no especificado': TD3.replace('7408122F', '7408122<'),
  },
  invalidos: {
    vacío: '',
    'líneas incompletas': TD3.slice(0, 40),
    'dígito del número': TD3.replace('C36', 'C37'),
    'dígito de nacimiento': TD3.replace('7408122F', '7408123F'),
    'dígito de vencimiento': TD3.replace('F1204159', 'F1204158'),
    'dígito de datos opcionales': TD3.replace(/10$/, '20'),
    'dígito compuesto': TD3.replace(/10$/, '11'),
    'sexo inválido': TD3.replace('7408122F', '7408122Q'),
    'tipo de documento inválido': `I${TD3.slice(1)}`,
    'mes de nacimiento inválido': TD3.replace('7408122F', '7438122F'),
  },
  formatos: [[oneLine(TD3), TD3]],
});

function longTd1(check: string): string {
  const number = 'ABC123456789';
  const l1 = `I<UTO${number.slice(0, 9)}<${number.slice(9)}${check}`.padEnd(30, '<');
  const l2 = `7408122F1204159UTO${'<'.repeat(11)}`;
  const composite = cd(l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29));
  return l1 + l2 + String(composite) + 'ERIKSSON<<ANNA'.padEnd(30, '<');
}

describe('MRZ', () => {
  it('el dígito de control sigue la especificación', () => {
    expect(cd('L898902C3')).toBe(6);
    expect(cd('740812')).toBe(2);
    expect(cd('<<<<<<')).toBe(0);
  });

  it('parse del pasaporte', () => {
    expect(new Td3().parse(TD3)).toEqual({
      documentCode: 'P',
      issuingState: 'UTO',
      surname: 'ERIKSSON',
      givenNames: 'ANNA MARIA',
      documentNumber: 'L898902C3',
      nationality: 'UTO',
      birthDate: '740812',
      sex: 'F',
      expiryDate: '120415',
      optionalData: 'ZE184226B',
    });
  });

  it('parse de las cédulas TD1 y TD2', () => {
    const td1 = new Td1().parse(TD1);
    expect(td1?.documentNumber).toBe('D23145890');
    expect(td1?.surname).toBe('ERIKSSON');
    expect(td1?.givenNames).toBe('ANNA MARIA');
    expect(td1?.expiryDate).toBe('120415');
    const td2 = new Td2().parse(TD2);
    expect(td2?.documentNumber).toBe('D23145890');
    expect(td2?.surname).toBe('ERIKSSON');
    expect(td2?.birthDate).toBe('740812');
  });

  it('nombre sin nombres de pila', () => {
    const l1 = 'P<UTOERIKSSON'.padEnd(44, '<');
    const l2 = oneLine(TD3).slice(44);
    expect(new Td3().parse(l1 + l2)?.givenNames).toBe('');
  });

  it('parse de una MRZ inválida devuelve null', () => {
    expect(new Td3().parse(TD3.replace('C36', 'C37'))).toBeNull();
    expect(new Td3().parse('')).toBeNull();
  });

  it('motivos de error', () => {
    const td3 = new Td3();
    expect(td3.validate('P<UTO').error).toBe(ValidationError.Format);
    expect(td3.validate(TD3.replace('C36', 'C37')).error).toBe(ValidationError.Checksum);
    expect(td3.validate(TD3.replace('F1204', 'Q1204')).error).toBe(ValidationError.Component);
    // El sexo no entra en el compuesto: el cambio solo lo detecta la regla de componentes.
    expect(td3.validate(TD3.replace('UTO7408122F', 'UTO7413122F')).error).toBe(ValidationError.Component);
  });

  it.each(['<', '0'])('fecha desconocida con dígito %s', (check) => {
    const l1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
    const l2 = `L898902C36UTO<<<<<<${check}F1204159ZE184226B<<<<<1`;
    const composite = cd(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43));
    const mrz = l1 + l2 + String(composite);
    expect(new Td3().isValid(mrz)).toBe(true);
    expect(new Td3().parse(mrz)?.birthDate).toBeNull();
  });

  it('una fecha desconocida con otro dígito es un error de componente', () => {
    const l2 = 'L898902C36UTO<<<<<<5F1204159ZE184226B<<<<<1';
    const mrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<${l2}0`;
    expect(new Td3().validate(mrz).error).toBe(ValidationError.Component);
  });

  it('datos opcionales vacíos aceptan dígito < o 0', () => {
    for (const check of ['<', '0']) {
      const l2 = `L898902C36UTO7408122F1204159${'<'.repeat(14)}${check}`;
      const composite = cd(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 43));
      const mrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<${l2}${composite}`;
      expect(new Td3().isValid(mrz), check).toBe(true);
    }
  });

  it('nombre sin apellido es un error de componente', () => {
    expect(new Td3().validate(TD3.replace('ERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', '<'.repeat(39))).error).toBe(
      ValidationError.Component,
    );
  });

  it('número de documento de más de nueve caracteres en TD1', () => {
    const mrz = longTd1(String(cd('ABC123456789')));
    const td1 = new Td1();
    expect(td1.isValid(mrz)).toBe(true);
    const data = td1.parse(mrz);
    expect(data?.documentNumber).toBe('ABC123456789');
    expect(data?.optionalData).toBe('');
    // El compuesto cubre la continuación: alterarla se detecta.
    expect(td1.isValid(replaceAt(mrz, 16, '0'))).toBe(false);
  });

  it('el dígito del número largo se verifica aunque el compuesto sea coherente', () => {
    const wrong = String((cd('ABC123456789') + 1) % 10);
    expect(new Td1().validate(longTd1(wrong)).error).toBe(ValidationError.Checksum);
  });

  it('un número de nueve caracteres no puede omitir su dígito', () => {
    const l1 = 'I<UTOD23145890<<<<<<<<<<<<<<<<';
    const l2 = '7408122F1204159UTO<<<<<<<<<<<';
    const composite = cd(l1.slice(5, 30) + l2.slice(0, 7) + l2.slice(8, 15) + l2.slice(18, 29));
    expect(new Td1().validate(l1 + l2 + String(composite) + 'ERIKSSON<<ANNA'.padEnd(30, '<')).error).toBe(
      ValidationError.Checksum,
    );
  });

  it('número de documento de más de nueve caracteres en TD2', () => {
    const number = 'ABC123456789';
    const l1 = 'I<UTOERIKSSON<<ANNA'.padEnd(36, '<');
    const l2 = `ABC123456<UTO7408122F1204159789${cd(number)}<<<`;
    const composite = cd(l2.slice(0, 10) + l2.slice(13, 20) + l2.slice(21, 35));
    const mrz = l1 + l2 + String(composite);
    expect(new Td2().isValid(mrz)).toBe(true);
    expect(new Td2().parse(mrz)?.documentNumber).toBe(number);
  });

  it('format reparte las líneas', () => {
    expect(new Td1().format(oneLine(TD1))).toBe(TD1);
    expect(new Td2().format(TD2)).toBe(TD2);
    expect(new Td3().format('P<UTO')).toBe('P<UTO');
  });
});
