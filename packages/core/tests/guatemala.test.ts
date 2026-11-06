import { Guatemala } from '../src';
import { documentSuite } from './helpers';

documentSuite('gt.dpi', () => new Guatemala.Dpi(), {
  validos: ['1234567890101', '1234 56789 0101'],
  invalidos: ['1234567880101', '1234567890001', '1234567892301', '123'],
  formatos: [['1234567890101', '1234 56789 0101']],
});

documentSuite('gt.nit', () => new Guatemala.Nit(), {
  validos: ['1234567-9', '123456789', '3602978-5', '12345678-9'],
  invalidos: ['1234567-8', '1234567', 'ABC', ''],
  formatos: [['12345679', '1234567-9']],
});
