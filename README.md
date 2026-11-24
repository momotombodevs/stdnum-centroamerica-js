# stdnum-centroamerica-js

Monorepo de [`@momotombo/stdnum-centroamerica`](packages/core): validación, formato y compactado de documentos de identidad y fiscales de Centroamérica (DPI, NIT, DUI, cédulas, RTN, RUC, DIMEX y MRZ de pasaportes) para TypeScript y JavaScript.

- Sin dependencias ni APIs de Node: funciona en Node, navegadores, React, React Native/Expo, Vue, Angular, NestJS, Deno, Bun y edge runtimes.
- ESM y CommonJS, con tipos incluidos.
- 18 documentos de 6 países, más las MRZ de ICAO 9303.

## Instalación

| Gestor | Comando |
|--------|---------|
| npm | `npm install @momotombo/stdnum-centroamerica` |
| pnpm | `pnpm add @momotombo/stdnum-centroamerica` |
| Yarn | `yarn add @momotombo/stdnum-centroamerica` |
| Bun | `bun add @momotombo/stdnum-centroamerica` |
| Deno | `deno add npm:@momotombo/stdnum-centroamerica` |
| Expo | `npx expo install @momotombo/stdnum-centroamerica` |

No necesita configuración extra con Yarn PnP ni con pnpm estricto, y no tiene código nativo: en React Native no hay que reconstruir la app. Para usarlo sin gestor de paquetes (CDN, `<script type="module">`), vea el [README del paquete](packages/core/README.md#navegador-sin-bundler-deno-y-bun).

## Uso rápido

```ts
import { Registry } from '@momotombo/stdnum-centroamerica';

// Validar
Registry.isValid('ni.cedula', '001-010190-0001N'); // true
Registry.isValid('gt.nit', '1234567-9');            // true

// Saber por qué falla
Registry.validate('sv.dui', '12345678-0').error;    // 'checksum'

// Dar formato y compactar
Registry.make('ni.cedula').format('0010101900001n');  // "001-010190-0001N"
Registry.make('ni.cedula').compact('001-010190-0001N'); // "0010101900001N"

// Leer los componentes
Registry.parse('ni.cedula', '001-010190-0001N')?.birthYearCandidates(); // [1990]
```

Con CommonJS: `const { Registry } = require('@momotombo/stdnum-centroamerica');`.

Cada documento se identifica con una clave `país.documento`:

| País | Claves |
|------|--------|
| Guatemala | `gt.dpi`, `gt.nit` |
| El Salvador | `sv.dui`, `sv.nit`, `sv.nrc` |
| Honduras | `hn.identidad`, `hn.rtn` |
| Nicaragua | `ni.cedula`, `ni.ruc` |
| Costa Rica | `cr.cedula_fisica`, `cr.cedula_juridica`, `cr.dimex`, `cr.nite` |
| Panamá | `pa.cedula`, `pa.ruc` |
| Internacional (MRZ) | `mrz.td1`, `mrz.td2`, `mrz.td3` |

## Documentación

- [README del paquete](packages/core/README.md): la API completa, opciones, nivel de validación de cada documento y ejemplos para React, React Native, Vue, Angular, Express, NestJS, Zod y React Hook Form.
- [Fuentes de los datos](docs/fuentes.md): de dónde sale cada regla y qué es oficial y qué no.
- [CHANGELOG](packages/core/CHANGELOG.md).

## Desarrollo

Requisitos: Node 22.18 o superior (lo exige tsdown) y npm (el repo usa npm workspaces y `package-lock.json`).

```sh
git clone https://github.com/momotombodevs/stdnum-centroamerica-js.git
cd stdnum-centroamerica-js
npm install
```

| Script | Qué hace |
|--------|----------|
| `npm run lint` | lint, formato y orden de imports con [Biome](https://biomejs.dev) (no modifica nada) |
| `npm run lint:fix` | aplica los arreglos seguros de Biome |
| `npm run format` | solo formatea |
| `npm run typecheck` | `tsc` sobre el código y las pruebas |
| `npm test` | pruebas con Vitest |
| `npm run test:coverage` | pruebas con cobertura (mínimo 90 %) |
| `npm run build` | compila ESM, CJS y tipos con tsdown en `packages/core/dist` |
| `npm run check:package` | `publint` y `are-the-types-wrong` sobre el paquete empacado |

El CI (`.github/workflows/ci.yml`) corre lint, typecheck y pruebas con cobertura en Node 20, 22 y 24, y build y `check:package` en 22 y 24 (tsdown no soporta Node 20). Antes de abrir un PR conviene correr lo mismo en local:

```sh
npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run check:package
```

### Estilo de código

Biome se configura en [`biome.json`](biome.json): 2 espacios, comillas simples, punto y coma, líneas de hasta 120 caracteres e imports ordenados. Los Markdown y YAML no se formatean. En VS Code, instale la extensión recomendada (`biomejs.biome`); `.vscode/settings.json` ya formatea al guardar con Biome. Si el editor usa Prettier, desactívelo para este repo, porque su configuración por defecto (comillas dobles, 80 columnas) choca con la del proyecto.

### Estructura

```
packages/core/
  src/
    documents/<país>/   un archivo por país con sus documentos
    data/               catálogos (municipios de Nicaragua, geografía de Honduras)
    registry.ts         Registry: claves, opciones y catálogo
    types.ts            Document, ValidationResult, ValidationError, Level
  tests/                una prueba por país, más registry.test.ts
docs/fuentes.md         fuentes de cada regla
```

Para agregar un documento: cree la clase en `src/documents/<país>/` (extendiendo `AbstractDocument`), regístrela en `registry.ts`, agregue sus pruebas en `tests/` y su fuente en `docs/fuentes.md`.

## Licencia

MIT
