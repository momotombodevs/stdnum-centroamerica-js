import * as CostaRica from './documents/costa-rica';
import * as ElSalvador from './documents/el-salvador';
import * as Guatemala from './documents/guatemala';
import * as Honduras from './documents/honduras';
import * as Mrz from './documents/mrz';
import * as Nicaragua from './documents/nicaragua';
import * as Panama from './documents/panama';
import {
  type Document,
  type DocumentInfo,
  isDocument,
  isGenerator,
  isParser,
  Level,
  type ValidationResult,
} from './types';

/** Error de uso del Registry: clave desconocida o documento sin la operación pedida. */
export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

/** Documentos incluidos, por clave. */
export interface DocumentMap {
  'gt.nit': Guatemala.Nit;
  'gt.dpi': Guatemala.Dpi;
  'sv.dui': ElSalvador.Dui;
  'sv.nit': ElSalvador.Nit;
  'sv.nrc': ElSalvador.Nrc;
  'hn.identidad': Honduras.Identidad;
  'hn.rtn': Honduras.Rtn;
  'ni.cedula': Nicaragua.Cedula;
  'ni.ruc': Nicaragua.Ruc;
  'cr.cedula_fisica': CostaRica.CedulaFisica;
  'cr.cedula_juridica': CostaRica.CedulaJuridica;
  'cr.dimex': CostaRica.Dimex;
  'cr.nite': CostaRica.Nite;
  'pa.cedula': Panama.Cedula;
  'pa.ruc': Panama.Ruc;
  'mrz.td3': Mrz.Td3;
  'mrz.td1': Mrz.Td1;
  'mrz.td2': Mrz.Td2;
}

/** Opciones que acepta cada documento incluido. */
export interface OptionsMap {
  'sv.nit': ElSalvador.NitOptions;
  'ni.cedula': Nicaragua.CedulaOptions;
  'ni.ruc': Nicaragua.RucOptions;
}

export type DocumentKey = keyof DocumentMap;
export type DocumentOptions<K extends string> = K extends keyof OptionsMap ? OptionsMap[K] : Record<string, unknown>;
type ParseResult<K extends string> = K extends DocumentKey
  ? DocumentMap[K] extends { parse(number: string): infer R }
    ? R
    : never
  : object | null;
type ParsableKey = {
  [K in DocumentKey]: DocumentMap[K] extends { parse(n: string): unknown } ? K : never;
}[DocumentKey];

/** Clase de un documento: se construye con un objeto de opciones opcional. */
// biome-ignore lint/suspicious/noExplicitAny: cada clase define sus propias opciones; con unknown no serían asignables
export type DocumentClass<T extends Document = Document> = new (options?: any) => T;

interface CatalogEntry extends DocumentInfo {
  readonly class: DocumentClass;
}

const entry = (key: DocumentKey, cls: DocumentClass, country: string, name: string, level: Level): CatalogEntry =>
  Object.freeze({ key, class: cls, country, name, level });

const CATALOG: ReadonlyMap<string, CatalogEntry> = new Map(
  [
    entry('gt.nit', Guatemala.Nit, 'GT', 'NIT', Level.Complete),
    entry('gt.dpi', Guatemala.Dpi, 'GT', 'DPI (CUI)', Level.Complete),
    entry('sv.dui', ElSalvador.Dui, 'SV', 'DUI', Level.Complete),
    entry('sv.nit', ElSalvador.Nit, 'SV', 'NIT', Level.Complete),
    entry('sv.nrc', ElSalvador.Nrc, 'SV', 'NRC', Level.Format),
    entry('hn.identidad', Honduras.Identidad, 'HN', 'Número de identidad', Level.Format),
    entry('hn.rtn', Honduras.Rtn, 'HN', 'RTN', Level.Format),
    entry('ni.cedula', Nicaragua.Cedula, 'NI', 'Cédula', Level.Complete),
    entry('ni.ruc', Nicaragua.Ruc, 'NI', 'RUC', Level.Format),
    entry('cr.cedula_fisica', CostaRica.CedulaFisica, 'CR', 'Cédula física', Level.Format),
    entry('cr.cedula_juridica', CostaRica.CedulaJuridica, 'CR', 'Cédula jurídica', Level.Format),
    entry('cr.dimex', CostaRica.Dimex, 'CR', 'DIMEX', Level.Format),
    entry('cr.nite', CostaRica.Nite, 'CR', 'NITE', Level.Format),
    entry('pa.cedula', Panama.Cedula, 'PA', 'Cédula', Level.Format),
    entry('pa.ruc', Panama.Ruc, 'PA', 'RUC', Level.Format),
    entry('mrz.td3', Mrz.Td3, 'ICAO', 'MRZ de pasaporte (TD3)', Level.Complete),
    entry('mrz.td1', Mrz.Td1, 'ICAO', 'MRZ de cédula (TD1)', Level.Complete),
    entry('mrz.td2', Mrz.Td2, 'ICAO', 'MRZ de identidad (TD2)', Level.Complete),
  ].map((e) => [e.key, e]),
);

const custom = new Map<string, DocumentClass>();

/**
 * Punto de entrada por clave `país.documento` (insensible a mayúsculas). Las opciones
 * se pasan al constructor del documento, p. ej. `{ strictLetter: true }` en `ni.cedula`.
 */
export const Registry = {
  /** Agrega o reemplaza un documento; tiene prioridad sobre los incluidos. */
  register(key: string, cls: DocumentClass): void {
    let instance: unknown;
    try {
      instance = typeof cls === 'function' ? new cls() : undefined;
    } catch {
      instance = undefined;
    }
    if (!isDocument(instance)) {
      throw new InvalidArgumentError(
        `${(cls as { name?: string } | null)?.name ?? String(cls)} no implementa Document (isValid, validate, format, compact)`,
      );
    }
    custom.set(key.toLowerCase(), cls);
  },

  make: function make(key: string, options: object = {}): Document {
    const k = key.toLowerCase();
    const cls = custom.get(k) ?? CATALOG.get(k)?.class;
    if (cls === undefined) {
      throw new InvalidArgumentError(`Documento no soportado: ${k}`);
    }
    return new cls(options);
  } as {
    <K extends DocumentKey>(key: K, options?: DocumentOptions<K>): DocumentMap[K];
    (key: string, options?: object): Document;
  },

  validate<K extends string>(key: K | DocumentKey, number: string, options?: DocumentOptions<K>): ValidationResult {
    return Registry.make(key, options).validate(number);
  },

  isValid<K extends string>(key: K | DocumentKey, number: string, options?: DocumentOptions<K>): boolean {
    return Registry.make(key, options).isValid(number);
  },

  /** Número sintético válido para pruebas y datos de ejemplo; es aleatorio y podría coincidir por azar con uno real. */
  generate<K extends string>(key: K | DocumentKey, options?: DocumentOptions<K>): string {
    const document = Registry.make(key, options);
    if (!isGenerator(document)) {
      throw new InvalidArgumentError(`El documento ${key} no genera números`);
    }
    return document.generate();
  },

  /**
   * Componentes de un número válido (fecha de nacimiento, municipio, tipo), o null si no
   * lo es. Solo los documentos que implementan ParsesNumbers los tienen.
   */
  parse: function parse(key: string, number: string, options?: object): object | null {
    const document = Registry.make(key, options);
    if (!isParser(document)) {
      throw new InvalidArgumentError(`El documento ${key} no tiene componentes que leer`);
    }
    return document.parse(number);
  } as {
    <K extends ParsableKey>(key: K, number: string, options?: DocumentOptions<K>): ParseResult<K>;
    (key: string, number: string, options?: object): object | null;
  },

  /** Claves disponibles: las registradas y las incluidas. */
  keys(): string[] {
    return [...new Set([...custom.keys(), ...CATALOG.keys()])];
  },

  /**
   * Documentos incluidos en el paquete, con país, nombre y alcance de la validación.
   * No lista los registrados con register().
   */
  describe(): DocumentInfo[] {
    return [...CATALOG.values()].map(({ key, country, name, level }) => ({ key, country, name, level }));
  },
};
