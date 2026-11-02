import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'

expect.extend(matchers)
