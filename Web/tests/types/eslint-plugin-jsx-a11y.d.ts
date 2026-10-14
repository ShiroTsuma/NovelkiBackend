// eslint-plugin-jsx-a11y ships no type declarations; this covers what eslint.config.js uses.
// It lives under tests/ because tsconfig.node.json (which type-checks eslint.config.js) includes tests/**/*.ts.
declare module 'eslint-plugin-jsx-a11y' {
  import type { ESLint, Linter } from 'eslint'

  const plugin: ESLint.Plugin & {
    flatConfigs: {
      recommended: Linter.Config
      strict: Linter.Config
    }
  }
  export default plugin
}
