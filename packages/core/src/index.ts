export {
  ValidationError,
  ValidationResult,
  Level,
  isDocument,
  isGenerator,
  isParser,
  type Document,
  type DocumentInfo,
  type GeneratesNumbers,
  type ParsesNumbers,
} from './types';
export { AbstractDocument } from './documents/abstract-document';
export {
  Registry,
  InvalidArgumentError,
  type DocumentClass,
  type DocumentKey,
  type DocumentMap,
  type DocumentOptions,
  type OptionsMap,
} from './registry';
export { HondurasGeografia, NicaraguaMunicipios } from './data';

export * as CostaRica from './documents/costa-rica';
export * as ElSalvador from './documents/el-salvador';
export * as Guatemala from './documents/guatemala';
export * as Honduras from './documents/honduras';
export * as Nicaragua from './documents/nicaragua';
export * as Panama from './documents/panama';
export * as Mrz from './documents/mrz';
export { AbstractMrz, MrzData, Td1, Td2, Td3, type MrzFields } from './documents/mrz';
