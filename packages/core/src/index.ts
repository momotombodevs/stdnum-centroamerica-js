export { HondurasGeografia, NicaraguaMunicipios } from './data';
export { AbstractDocument } from './documents/abstract-document';
export * as CostaRica from './documents/costa-rica';
export * as ElSalvador from './documents/el-salvador';
export * as Guatemala from './documents/guatemala';
export * as Honduras from './documents/honduras';
export * as Mrz from './documents/mrz';
export { AbstractMrz, MrzData, type MrzFields, Td1, Td2, Td3 } from './documents/mrz';
export * as Nicaragua from './documents/nicaragua';
export * as Panama from './documents/panama';
export {
  type DocumentClass,
  type DocumentKey,
  type DocumentMap,
  type DocumentOptions,
  InvalidArgumentError,
  type OptionsMap,
  Registry,
} from './registry';
export {
  type Document,
  type DocumentInfo,
  type GeneratesNumbers,
  isDocument,
  isGenerator,
  isParser,
  Level,
  type ParsesNumbers,
  ValidationError,
  ValidationResult,
} from './types';
