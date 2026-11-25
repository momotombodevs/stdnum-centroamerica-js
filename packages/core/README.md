# @momotombodevs/stdnum-centroamerica

Validación, formato y compactado de documentos de identidad y fiscales de Centroamérica, en TypeScript.

- Sin dependencias, sin APIs de Node: funciona en Node, navegadores, React Native/Expo, Deno, Bun y edge runtimes.
- ESM y CommonJS, con tipos para ambos (`.d.ts` y `.d.cts`).
- `sideEffects: false`: los bundlers eliminan lo que no se usa.

## Instalación

```sh
npm install @momotombodevs/stdnum-centroamerica   # npm
pnpm add @momotombodevs/stdnum-centroamerica      # pnpm
yarn add @momotombodevs/stdnum-centroamerica      # Yarn (classic y Berry)
bun add @momotombodevs/stdnum-centroamerica       # Bun
deno add npm:@momotombodevs/stdnum-centroamerica  # Deno 2
npx expo install @momotombodevs/stdnum-centroamerica  # Expo: igual que npm, sin código nativo
```

Es una dependencia normal de producción (no `-D`): se usa en tiempo de ejecución. No tiene dependencias propias, scripts de instalación ni código nativo, así que en React Native/Expo no hay que hacer `pod install` ni reconstruir la app.

- **Yarn PnP / pnpm estricto**: no necesita configuración extra; no depende de paquetes no declarados.
- **Deno** sin `deno add`: importe directamente con `npm:@momotombodevs/stdnum-centroamerica`.
- **Sin gestor de paquetes**: ver [Navegador sin bundler](#navegador-sin-bundler-deno-y-bun).

## Uso

Cada documento tiene una clave `país.documento` (`ni.cedula`, `ni.ruc`, ...) y tres operaciones: `isValid()`, `format()` y `compact()`.

```ts
import { Registry } from '@momotombodevs/stdnum-centroamerica';

// Validar
Registry.isValid('ni.cedula', '001-010190-0001N'); // true
Registry.isValid('ni.cedula', '001-010190-0001A'); // true: la letra no se comprueba por defecto
Registry.isValid('ni.ruc', 'J0310000000001');      // true: persona jurídica
Registry.isValid('ni.ruc', '0000300766011M');      // false: un RUC no puede iniciar con cuatro ceros

// Dar formato y compactar
Registry.make('ni.cedula').format('0010101900001n');    // "001-010190-0001N"
Registry.make('ni.cedula').compact('001-010190-0001n'); // "0010101900001N"
```

`format()` y `compact()` no validan ni lanzan errores: con un número inválido devuelven su forma compacta, sin agrupar (`format('abc')` da `"ABC"`). Valide primero si va a guardar el resultado. `isValid()` devuelve `false` con cadenas vacías, `null` o `undefined`, y una clave desconocida lanza `InvalidArgumentError`.

Con CommonJS:

```js
const { Registry } = require('@momotombodevs/stdnum-centroamerica');
```

`validate()` devuelve además el motivo del fallo, útil para mostrar mensajes de error:

```ts
import { Registry, ValidationError } from '@momotombodevs/stdnum-centroamerica';

const result = Registry.validate('ni.cedula', '001-010190-0001A', { strictLetter: true });
result.isValid(); // false
result.error;     // 'checksum' (ValidationError.Checksum)
```

| `ValidationError` | Valor | Significado |
|-------------------|-------|-------------|
| `Format` | `'format'` | longitud, caracteres o estructura incorrectos |
| `Component` | `'component'` | un componente (fecha, departamento, municipio, prefijo) fuera de lo permitido |
| `Checksum` | `'checksum'` | el dígito o la letra de control no coincide |

La cédula de Nicaragua no comprueba la letra por defecto, porque el CSE no publica la fórmula (módulo 23, de fuentes no oficiales). Se puede ajustar con opciones, que `Registry` pasa al constructor:

```ts
// Comprobar la letra (la correcta de este número es N)
Registry.isValid('ni.cedula', '001-010190-0001A', { strictLetter: true }); // false

// Exigir que el código de municipio esté en la lista conocida (282 no figura en ella)
Registry.isValid('ni.cedula', '282-010190-0001A');                               // true
Registry.isValid('ni.cedula', '282-010190-0001A', { strictMunicipality: true }); // false

// ni.ruc acepta las mismas opciones para los RUC que son una cédula
Registry.isValid('ni.ruc', '001-010190-0001A', { strictLetter: true }); // false
```

También se pueden usar las clases directamente:

```ts
import { Nicaragua, Guatemala, Td3 } from '@momotombodevs/stdnum-centroamerica';

const cedula = new Nicaragua.Cedula({ strictMunicipality: true });
cedula.isValid('001-010190-0001N');            // true
Nicaragua.Cedula.checkLetter('0010101900001'); // "N"

new Guatemala.Nit().format('12345679'); // "1234567-9"

const mrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
new Td3().parse(mrz)?.surname; // "ERIKSSON"
```

Los documentos se agrupan por país: `CostaRica`, `ElSalvador`, `Guatemala`, `Honduras`, `Nicaragua`, `Panama` y `Mrz` (las MRZ `Td1`, `Td2` y `Td3` también se exportan sueltas).

`Registry.describe()` devuelve la clave, el país, el nombre y el alcance (`Level.Complete` o `Level.Format`) de cada documento incluido.

### Leer los componentes

`Registry.parse(clave, número)` lee los componentes que el número ya trae: devuelve un objeto de solo lectura, o `null` si el número no es válido. Está disponible en `ni.cedula`, `hn.identidad`, `gt.dpi`, `pa.cedula` y las tres MRZ (`mrz.td1`, `mrz.td2`, `mrz.td3`); en los demás lanza `InvalidArgumentError`. En TypeScript el tipo del resultado depende de la clave.

```ts
const cedula = Registry.parse('ni.cedula', '001-010190-0001N'); // Nicaragua.CedulaData | null
cedula?.municipalityCode;        // 1
cedula?.birthDay;                // 1
cedula?.birthMonth;              // 1
cedula?.birthYearTwoDigits;      // 90
cedula?.birthYearCandidates();   // [1990]: el número no dice el siglo, así que se ofrecen los años posibles

Registry.parse('hn.identidad', '0906-1990-00001')?.municipalityCode; // 6
Registry.parse('gt.dpi', '1234 56789 0101')?.departmentCode;          // 1
Registry.parse('pa.cedula', 'PE-5-687')?.kind;                        // 'bornAbroad' (Panama.CedulaKind.BornAbroad)
```

En Nicaragua, el municipio y la letra de control son de terceros (el CSE no los publica) y el código 888 tiene una sola fuente; en Panamá, las provincias 10 a 13 y los sufijos PI y AV tampoco son oficiales (ver las [fuentes de los datos](https://github.com/momotombodevs/stdnum-centroamerica-js/blob/main/docs/fuentes.md)). Los componentes salen de la estructura del número y no se contrastan con ningún registro, y la fecha de nacimiento es un dato personal: trátela como tal.

### Generar números de prueba

`Registry.generate(clave)` produce un número sintético válido, útil para fixtures y datos de ejemplo. Usa `Math.random`: es aleatorio, no apto para fines de seguridad, y puede coincidir por azar con un número real, así que no lo use como dato de personas.

```ts
Registry.generate('gt.dpi'); // "2381590430101"
```

### Documentos propios

Una clave desconocida lanza `InvalidArgumentError`. `Registry.keys()` lista las claves disponibles y `Registry.register(clave, Clase)` agrega o reemplaza un documento; la clase debe implementar `Document` (lo más simple es extender `AbstractDocument`).

```ts
import { AbstractDocument, Registry } from '@momotombodevs/stdnum-centroamerica';

class CodigoPostal extends AbstractDocument {
  protected override readonly pattern = /^\d{5}$/;
}

Registry.register('xx.codigo_postal', CodigoPostal);
Registry.isValid('xx.codigo_postal', '12345'); // true
```

### Referencia rápida de `Registry`

| Método | Devuelve |
|--------|----------|
| `isValid(clave, número, opciones?)` | `boolean` |
| `validate(clave, número, opciones?)` | `ValidationResult`: `isValid()` y `error` (`ValidationError` o `null`) |
| `make(clave, opciones?)` | la instancia del documento, con `isValid()`, `validate()`, `format()` y `compact()` |
| `parse(clave, número)` | los componentes del número, o `null` si no es válido (solo en las claves listadas arriba) |
| `generate(clave)` | un número sintético válido |
| `keys()` | las claves registradas |
| `describe()` | `{ key, country, name, level }` de cada documento incluido |
| `register(clave, Clase)` | agrega o reemplaza un documento |

## Documentos soportados

**completa** = valida formato y dígito verificador; **formato** = valida longitud, caracteres y rangos básicos.

| País | Documento | Clave | Nivel |
|------|-----------|-------|-------|
| Guatemala | NIT | `gt.nit` | completa |
| Guatemala | DPI (CUI) | `gt.dpi` | completa (verificador y departamento) |
| El Salvador | DUI | `sv.dui` | completa |
| El Salvador | NIT | `sv.nit` | completa (acepta también el DUI de 9 dígitos) |
| El Salvador | NRC | `sv.nrc` | formato |
| Honduras | Número de identidad | `hn.identidad` | formato (departamento y municipio válidos) |
| Honduras | RTN | `hn.rtn` | formato |
| Nicaragua | Cédula | `ni.cedula` | completa (letra de control con `strictLetter`, desactivada por defecto) |
| Nicaragua | RUC | `ni.ruc` | formato |
| Costa Rica | Cédula física | `cr.cedula_fisica` | formato |
| Costa Rica | Cédula jurídica | `cr.cedula_juridica` | formato |
| Costa Rica | DIMEX | `cr.dimex` | formato |
| Costa Rica | NITE | `cr.nite` | formato |
| Panamá | Cédula | `pa.cedula` | formato |
| Panamá | RUC | `pa.ruc` | formato (no valida el DV) |
| Internacional | MRZ de pasaporte (TD3) | `mrz.td3` | completa (ICAO 9303) |
| Internacional | MRZ de cédula (TD1) | `mrz.td1` | completa (ICAO 9303) |
| Internacional | MRZ de identidad (TD2) | `mrz.td2` | completa (ICAO 9303) |

Notas:

- Las **MRZ** (zona de lectura mecánica de pasaportes y cédulas) se reciben con o sin saltos de línea. `parse()` devuelve los datos de una MRZ válida; las fechas quedan en `AAMMDD`, porque el siglo no se puede inferir. El paquete valida pero no guarda ni envía nada.
- En **Panamá** tomo y asiento tienen longitud variable, así que el número solo se interpreta con guiones. Use `format()` para la forma canónica (`8-926-1601`); `compact()` quita los guiones.
- En **Honduras**, `hn.identidad` acepta los códigos especiales de naturalizados (`0890`) y doble nacionalidad (`0880`).

## Uso en cada entorno

El paquete no necesita adaptadores: es una función pura que cada framework llama a su manera. Estos son los patrones mínimos.

### React y React Native (Expo)

```tsx
import { useMemo, useState } from 'react';
import { Registry, type DocumentKey } from '@momotombodevs/stdnum-centroamerica';

function useDocument(key: DocumentKey, value: string) {
  return useMemo(() => {
    const doc = Registry.make(key);
    return { error: doc.validate(value).error, formatted: doc.format(value) };
  }, [key, value]);
}

export function CampoDpi() {
  const [value, setValue] = useState('');
  const { error } = useDocument('gt.dpi', value);
  return (
    <>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      {value && error && <span>DPI no válido ({error})</span>}
    </>
  );
}
```

Con React Hook Form o Formik basta una función de validación: `validate: (v) => Registry.isValid('gt.dpi', v) || 'DPI no válido'`. Con Zod: `z.string().refine((v) => Registry.isValid('gt.dpi', v), 'DPI no válido')`.

### Vue

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Registry } from '@momotombodevs/stdnum-centroamerica';

const cedula = ref('');
const error = computed(() => Registry.validate('ni.cedula', cedula.value).error);
</script>

<template>
  <input v-model="cedula" @blur="cedula = Registry.make('ni.cedula').format(cedula)" />
  <small v-if="cedula && error">Cédula no válida</small>
</template>
```

### Angular (formularios reactivos)

```ts
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Registry, type DocumentKey } from '@momotombodevs/stdnum-centroamerica';

export function documentoValidator(key: DocumentKey, options?: object): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null; // combínelo con Validators.required
    const error = Registry.validate(key, String(control.value), options).error;
    return error ? { documento: { key, error } } : null;
  };
}

// new FormControl('', [Validators.required, documentoValidator('sv.dui')])
```

### Node.js, Express y NestJS

```ts
import { Registry } from '@momotombodevs/stdnum-centroamerica';

app.post('/clientes', (req, res) => {
  if (!Registry.isValid('hn.rtn', req.body.rtn)) {
    return res.status(422).json({ error: 'RTN no válido' });
  }
  // guardar la forma compacta
  const rtn = Registry.make('hn.rtn').compact(req.body.rtn);
  // ... guardar rtn
  res.status(201).json({ rtn });
});
```

En NestJS, con `class-validator`:

```ts
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { Registry, type DocumentKey } from '@momotombodevs/stdnum-centroamerica';

export function IsDocumento(key: DocumentKey, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isDocumento',
      target: object.constructor,
      propertyName,
      options: { message: `$property no es un ${key} válido`, ...validationOptions },
      validator: { validate: (value: unknown) => typeof value === 'string' && Registry.isValid(key, value) },
    });
}

export class CrearClienteDto {
  @IsDocumento('cr.cedula_fisica')
  cedula!: string;
}
```

### Navegador sin bundler, Deno y Bun

```html
<script type="module">
  import { Registry } from 'https://cdn.jsdelivr.net/npm/@momotombodevs/stdnum-centroamerica@0.1/+esm';
  console.log(Registry.isValid('sv.dui', '12345678-4'));
</script>
```

Fije la versión en la URL (`@0.1`) para que una versión mayor no le cambie el código sin aviso. También funciona con `https://esm.sh/@momotombodevs/stdnum-centroamerica@0.1` y `https://unpkg.com/@momotombodevs/stdnum-centroamerica@0.1/dist/index.js`.

En Deno: `import { Registry } from 'npm:@momotombodevs/stdnum-centroamerica@0.1';` (o `deno add` y luego `import ... from '@momotombodevs/stdnum-centroamerica'`). En Bun funciona igual que en Node, con ESM o `require`.

## Compatibilidad

- Código ES2020: Node 18 o superior, navegadores modernos, Hermes (React Native).
- TypeScript con `moduleResolution` `bundler`, `node16`/`nodenext` o `node`.

## Licencia

MIT
