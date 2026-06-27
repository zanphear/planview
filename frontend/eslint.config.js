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
      // react-hooks v7 ships the React Compiler lints as errors. The project does
      // not run the React Compiler yet, and set-state-in-effect flags the legacy
      // fetch-into-useState pattern that the TanStack Query migration removes
      // (ADR 0003). Keep them visible as warnings; promote back to error once the
      // compiler is enabled and the migration is complete. Real correctness rules
      // (rules-of-hooks, exhaustive-deps, the TS rules) stay as their defaults.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
