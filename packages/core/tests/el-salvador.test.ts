import { ElSalvador } from '../src';
import { documentSuite } from './helpers';

documentSuite('sv.dui', () => new ElSalvador.Dui(), {
  validos: ['12345678-4', '123456784'],
  invalidos: ['12345678-5', '1234567', 'ABCDEFGH-4'],
  formatos: [['123456784', '12345678-4']],
});

documentSuite('sv.nit', () => new ElSalvador.Nit(), {
  validos: {
    // NIT de muestra de la guía de integración DTE de la DGII (rutina nueva y antigua)
    'DGII correlativo 136': '0614-130386-136-4',
    'DGII correlativo 001': '0716-200261-001-4',
    'DGII correlativo 002': '0511-130963-002-1',
    'sin guiones': '06141303861364',
    'DUI como NIT (9 dígitos)': '12345678-4',
  },
  invalidos: {
    'verificador incorrecto': '0614-130386-136-5',
    'verificador incorrecto, rutina antigua': '0716-200261-001-5',
    'relleno de la guía': '10101010101010',
    'DUI con verificador incorrecto': '12345678-5',
    corto: '0614-130386-136',
    letras: '0614-130386-136-A',
    vacío: '',
  },
  formatos: [
    ['06141303861364', '0614-130386-136-4'],
    ['123456784', '12345678-4'],
  ],
});

documentSuite('sv.nrc', () => new ElSalvador.Nrc(), {
  validos: ['123456-7', '1234567', '01234567', '1', '12345678'],
  invalidos: ['123456789', '12A456', 'ABC', ''],
  formatos: [['1234567', '123456-7']],
});
