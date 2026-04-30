import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  // Shared rules
  {
    rules: {
	// Modern JS
	  'no-var': 'error',
	  'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',
      'prefer-template': 'warn',
	  'object-shorthand': 'warn',
      'arrow-body-style': ['warn', 'as-needed'],
	  
	// Best practices  
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      

    },
  },

  // Backend-specific
  {
    files: ['server/**/*.js'],
	env: { node: true },
    languageOptions: {
	  ecmaVersion: 'latest',
      sourceType: 'module', //commonjs
      globals: { ...globals.node },
    },
    rules: {
      // Node.js specific
      'no-console': 'off', // Console OK in Node.js
      'no-process-exit': 'warn', // Avoid process.exit()
    },
  },

  // Frontend-specific
  {
    files: ['client/**/*.js'],
	env: { browser: true },
    languageOptions: {
	  ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': 'warn',
	  'no-alert': 'warn', // Avoid alert()
      'no-eval': 'error',

    },
  },
  
  {
        files: ['vite.config.js', 'eslint.config.mjs'],
        languageOptions: {
            globals: { ...globals.node },
        },
  },


  // Prettier (disables conflicting ESLint rules)
  eslintConfigPrettier,
];
