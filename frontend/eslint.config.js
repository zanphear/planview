import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // react-hooks v7 ships the React Compiler optimization lints as errors. The
      // project does not run the React Compiler yet, so these advisories (which
      // only affect compiler-generated memoization) are downgraded to warnings;
      // promote back to error once the compiler is enabled. Genuine correctness
      // rules stay as errors: rules-of-hooks, set-state-in-render (infinite-loop
      // bug), error-boundaries, plus the TS rules. exhaustive-deps stays a warning.
      //
      // set-state-in-effect stays an ERROR: server data now lives in TanStack Query
      // (ADR 0003), so a new fetch-into-useState should fail CI. The few legitimate
      // UI-sync effects that remain carry a targeted eslint-disable with a reason.
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/void-use-memo': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/memoized-effect-dependencies': 'warn',
      'react-hooks/no-deriving-state-in-effects': 'warn',
      'react-hooks/automatic-effect-dependencies': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/config': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
