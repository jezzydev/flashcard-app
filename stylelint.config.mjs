/** @type {import('stylelint').Config} */
export default {
    extends: ['stylelint-config-standard'],

    rules: {
        // === Prevent Errors ===
        'block-no-empty': true,
        'color-no-invalid-hex': true,
        'declaration-block-no-duplicate-properties': true,
        'font-family-no-duplicate-names': true,
        'property-no-unknown': true,
        'selector-pseudo-class-no-unknown': true,
        'selector-type-no-unknown': true,
        'unit-no-unknown': true,

        // === Best Practices ===
        'color-named': 'never',
        'length-zero-no-unit': true,
        'shorthand-property-no-redundant-values': true,
        'declaration-no-important': true,

        // === Formatting ===
        'color-hex-length': 'long',

        // === Flexibility (allow different naming styles) ===
        'selector-class-pattern': null,
        'custom-property-pattern': null,
    },
};
