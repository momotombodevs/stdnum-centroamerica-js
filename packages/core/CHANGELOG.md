# Changelog

## [Unreleased]

## [0.1.0] - 2026-11-05

Primera versión publicada.

### Agregado
- 18 documentos: `gt.nit`, `gt.dpi`, `sv.dui`, `sv.nit`, `sv.nrc`, `hn.identidad`, `hn.rtn`, `ni.cedula`, `ni.ruc`, `cr.cedula_fisica`, `cr.cedula_juridica`, `cr.dimex`, `cr.nite`, `pa.cedula`, `pa.ruc`, `mrz.td1`, `mrz.td2` y `mrz.td3`.
- `Registry` con `make`, `validate`, `isValid`, `generate`, `parse`, `keys`, `describe` y `register`; los errores de uso lanzan `InvalidArgumentError`, las opciones son un objeto (`{ strictLetter: true }`) y el tipo de `make()` y `parse()` depende de la clave.
- ESM y CommonJS con tipos para cada uno, sin dependencias ni APIs de Node; un archivo por módulo para que los bundlers eliminen los documentos que no se usan.
