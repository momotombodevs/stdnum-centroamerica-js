# Plan de implementación: @momotombo/stdnum-centroamerica

Oct 20, 2026 · @Manuel Duarte

Portar la librería PHP a TypeScript en `momotombodevs/stdnum-centroamerica-js` y publicarla en npm como `@momotombo/stdnum-centroamerica` toma entre 16 y 22 horas, repartidas en 9 fases. El orden va de lo más simple a lo más complejo; cada fase termina con pruebas en verde para hacer un commit por fase.

- **Repo PHP (origen):** `momotombodevs/stdnum-centroamerica`
- **Repo JS/TS (destino):** `momotombodevs/stdnum-centroamerica-js`, monorepo con workspaces en `packages/*`
- **Paquete núcleo:** `@momotombo/stdnum-centroamerica` (ESM + CJS + tipos, sin dependencias, sin APIs de Node)
- **Adaptadores (después):** `-react` (sirve también para React Native), `-vue`, `-angular`

## Fase 0: base del monorepo (1 hora)

La base queda lista cuando `npm test`, `npm run typecheck` y `npm run build` pasan con un primer documento.

- [x] Workspaces, `tsdown` (en lugar de `tsup`, que no genera tipos con TypeScript 7), `vitest` y `tsconfig` estricto
- [x] `types.ts`, `AbstractDocument` y el documento `sv.dui` con su prueba
- [x] Copiar `LICENSE` (MIT) y crear `.gitignore`

## Fase 1: documentos de solo formato (1 a 2 horas)

Seis documentos que solo necesitan una regex, un `format()` y un `generate()`. Portar los tests de `tests/CostaRica`, `ElSalvador/NrcTest` y `Honduras/RtnTest`.

- [x] `cr.cedula_fisica`, `cr.cedula_juridica`, `cr.dimex`, `cr.nite`
- [x] `sv.nrc`
- [x] `hn.rtn`

## Fase 2: documentos con dígito verificador (2 a 3 horas)

Tres documentos con módulo 11 o fórmulas por tramo; `gt.dpi` suma un `parse()` con `DpiData`.

- [x] `gt.nit` (módulo 11, el verificador puede ser `K`)
- [x] `gt.dpi` (módulo 11, departamento 1 a 22)
- [x] `sv.nit` (acepta 9 dígitos delegando a `Dui`, y 14 con dos fórmulas según el correlativo)

**Cuidado:** en `gt.dpi.generate()` hay un bucle que repite mientras el verificador da 10; hay que replicarlo.

## Fase 3: Nicaragua y Honduras (3 a 4 horas)

Incluye las tablas de datos y los documentos con opciones y `parse()`.

- [x] Tablas: `NicaraguaMunicipios` (CODES, FOREIGN\_CODE 888, MAX\_CODE 640) y `HondurasGeografia`
- [x] `ni.cedula` con opciones `strictLetter` y `strictMunicipality`, `parse()`, `birthYearCandidates()` y `checkLetter()` estático
- [x] `ni.ruc` (recibe una `Cedula` interna)
- [x] `hn.identidad` con `parse()` y los códigos especiales 0880 y 0890

**Cuidado:** `checkdate()` no existe en JS; hay que escribir un helper `isValidDate(año, mes, día)` y usar el año 2000 para aceptar el 29 de febrero. La validación de año en Honduras usa `new Date().getFullYear()`.

## Fase 4: Panamá (2 horas)

La cédula conserva los guiones al validar; `AbstractDocument` ya lo contempla con `prepare()`.

- [x] `pa.cedula` con `normalize()`, el `PATTERN` público, `parse()` y `CedulaKind` (4 tipos)
- [x] `pa.ruc` (reutiliza el patrón de la cédula más 3 formas extra, longitud entre 5 y 21)

## Fase 5: MRZ (3 a 4 horas)

Es la fase más larga. Probar con la MRZ de ejemplo ICAO que usa el README (`P<UTOERIKSSON<<ANNA<MARIA...`).

- [x] `AbstractMrz`: `checkDigit` (pesos 7-3-1, letras A=10…Z=35, `<`=0), componentes, dígitos y `parse()`
- [x] `MrzFields` y `MrzData` como interfaces
- [x] `Td1`, `Td2`, `Td3` con `fields()`, `draft()` y `longNumber`

**Cuidado:** hay que traducir `substr_replace`, `str_pad` (`padEnd` con `<`), `array_pad` y `str_split`.

## Fase 6: Registry y exportaciones (2 horas)

Las opciones pasan a ser un objeto: `Registry.isValid('ni.cedula', n, { strictLetter: true })`.

- [x] Catálogo con las 18 claves y `DocumentInfo` (clave, país, nombre, nivel)
- [x] `make`, `validate`, `isValid`, `generate`, `parse`, `keys`, `describe` y `register`
- [x] Claves insensibles a mayúsculas; error claro si la clave no existe o el documento no soporta `parse` o `generate`
- [x] `index.ts` exporta clases, tipos y `Registry`

## Fase 7: calidad y empaquetado (2 horas)

- [x] Cobertura mínima de 90 % (`vitest --coverage`), igual que en PHP
- [x] Probar el paquete empacado: `npm pack`, Node con `import` y `require`, TypeScript (`nodenext`, `node16`, `bundler`), bundle de navegador con esbuild, `publint` y `attw`
- [ ] Probarlo en una app Vite real y una app Expo
- [x] GitHub Actions con Node 20, 22 y 24: typecheck, test y build
- [x] README en español (adaptado del PHP) y `CHANGELOG.md`

## Fase 8: publicación (30 minutos)

- [ ] Crear la organización `momotombo` en npm (o cambiar el nombre del paquete)
- [ ] `npm login`, `npm pack --dry-run` y `npm publish --access public`
- [ ] Etiquetar `v0.1.0` en GitHub
- [ ] Más adelante, publicar con provenance desde GitHub Actions

## Fase 9: adaptadores (después, por separado)

Un adaptador por vez, cada uno con una app de prueba mínima.

- [ ] `-react`: hook `useDocument(key)`; sirve también para React Native
- [ ] `-vue`: composable equivalente
- [ ] `-angular`: validador para formularios reactivos y pipe de formato

## Reglas de traducción PHP a TypeScript

Cada construcción de PHP tiene un equivalente directo en TypeScript; `generate()` usa `Math.random` porque produce datos sintéticos de prueba, no valores de seguridad, y el README debe decirlo.

| PHP | TypeScript |
| --- | --- |
| `enum` | objeto `const` + tipo unión |
| `sprintf('%02d', n)` | `String(n).padStart(2, '0')` |
| `random_int(a, b)` | helper `randomInt(a, b)` con `Math.random` |
| `array_rand` | `arr[randomInt(0, arr.length - 1)]` |
| `ctype_digit` | `/^\d+$/.test(s)` |
| `substr($s, 0, -1)` | `s.slice(0, -1)` |
| `date('Y')` | `new Date().getFullYear()` |
| `checkdate(m, d, y)` | helper `isValidDate(y, m, d)` |
| Argumentos con nombre | objeto de opciones |
| `?T` y `null` | `T \| null` |
| Data providers de PHPUnit | `it.each([...])` |

## Total estimado

El núcleo publicado (fases 0 a 8) toma entre 16 y 22 horas; los adaptadores de la fase 9 se estiman aparte, cerca de 50 a 100 líneas de código cada uno.
