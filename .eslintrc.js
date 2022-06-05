module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'airbnb',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: [
    'react',
    'react-hooks',
  ],
  rules: {
    "brace-style": ["error", "stroustrup"],
    "react/jsx-props-no-spreading": ["off"],
    "jsx-a11y/click-events-have-key-events": ["off"],
    "jsx-a11y/no-static-element-interactions": ["off"],
    "no-param-reassign": ["error", { "props": false }],
    "jsx-a11y/label-has-associated-control": ["off"],
    'import/extensions': [
      "error",
      "ignorePackages",
      {
        "js": "never",
        "jsx": "never",
        "ts": "never",
        "tsx": "never"
      }
    ],
  },
  settings: {
    'import/resolver': {
      typescript: {}
    }
  },
  overrides: [{
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      'airbnb',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      "plugin:import/recommended",
      "plugin:import/typescript",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 2018,
      sourceType: 'module',
      project: ['./tsconfig.json', './tsconfig.client.json'],
    },
    plugins: [
      'react',
      '@typescript-eslint',
      'import',
    ],
    rules: {
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": ["error"],
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": ["error"],
      "react/jsx-props-no-spreading": ["off"],
      "brace-style": ["error", "stroustrup"],
      "no-param-reassign": ["error", { "props": false }],
      "react/jsx-filename-extension": [1, { "extensions": [".tsx", ".jsx"] }],
      'import/extensions': [
        "error",
        "ignorePackages",
        {
          "js": "never",
          "jsx": "never",
          "ts": "never",
          "tsx": "never"
        }
      ],
      'react/require-default-props': ['off'],
      'jsx-a11y/click-events-have-key-events': ['off'],
      'jsx-a11y/no-static-element-interactions': ['off'],
      'jsx-a11y/label-has-associated-control': ['off'],
      'react/function-component-definition': [2, { 'namedComponents': 'arrow-function' }],
      'function-paren-newline': ['off'],
    }
  }]
};
