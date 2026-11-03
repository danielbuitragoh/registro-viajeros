import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import 'vitest-axe/extend-expect'

expect.extend(matchers)

// jsdom no implementa el desplazamiento (lo avisa por consola): en las pruebas basta con una función vacía.
window.scrollTo = (() => undefined) as typeof window.scrollTo
