import { CostaRica } from '../src';
import { documentSuite } from './helpers';

documentSuite('cr.cedula_fisica', () => new CostaRica.CedulaFisica(), {
  validos: ['1-0123-0456', '101230456'],
  invalidos: ['0-0123-0456', '1-0123-045', 'A-0123-0456'],
  formatos: [['101230456', '1-0123-0456']],
});

documentSuite('cr.cedula_juridica', () => new CostaRica.CedulaJuridica(), {
  validos: { a: '3-101-123456', b: '3101123456', 'sin regla de cero inicial': '0-101-123456' },
  invalidos: ['3-101-12345', '3-101-1234567', '3-101-12345A'],
  formatos: [['3101123456', '3-101-123456']],
});

documentSuite('cr.dimex', () => new CostaRica.Dimex(), {
  validos: ['155812345678', '15581234567'],
  invalidos: ['055812345678', '1558123456', '1558123456789'],
  formatos: [['155812345678', '155812345678']],
});

documentSuite('cr.nite', () => new CostaRica.Nite(), {
  validos: ['1234567890'],
  invalidos: ['123456789', '12345678901', 'ABCDEFGHIJ'],
  formatos: [['1234567890', '1234567890']],
});
