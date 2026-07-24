import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom', // default fallback — covers existing client tests
        environmentMatchGlobs: [
            ['tests/server/**', 'node'], // backend tests get real Node, no DOM polyfills
        ],
        include: ['tests/**/*.test.{js,ts}'],
    },
});
