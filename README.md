# stdnum-centroamerica-js

Monorepo de [`@momotombo/stdnum-centroamerica`](packages/core): validación, formato y compactado de documentos de identidad y fiscales de Centroamérica para TypeScript y JavaScript (Node, navegadores, React, React Native, Vue, Angular, NestJS, Deno, Bun).

```
npm install @momotombo/stdnum-centroamerica
```

```ts
import { Registry } from '@momotombo/stdnum-centroamerica';

Registry.isValid('ni.cedula', '001-010190-0001N'); // true
```

La documentación completa está en [packages/core/README.md](packages/core/README.md), y las fuentes de cada regla (qué es oficial y qué no) en [docs/fuentes.md](docs/fuentes.md).

## Desarrollo

```
npm install
npm run typecheck
npm test            # o npm run test:coverage (mínimo 90 %)
npm run build
npm run check:package  # publint + are-the-types-wrong sobre el paquete empacado
```

## Licencia

MIT
