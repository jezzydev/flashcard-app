import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { glob } from 'glob';

export default defineConfig(({ command, mode }) => {
    // Load environment variables based on the current mode and cwd
    const env = loadEnv(mode, process.cwd(), '');

    //Find all html files
    const htmlFiles = glob.sync('**/*.html', {
        ignore: ['node_modules/**', 'dist/**'],
    });

    const input = Object.fromEntries(
        htmlFiles.map((file) => [
            file.replace('.html', ''),
            resolve(__dirname, file),
        ]),
    );

    return {
        //base: mode === 'production' ? '/auth-frontend/' : '/', //Configure base if serving on GitHub Pages so that it points to the subdirectory as base
        root: 'client',
        build: {
            //Without rollupOptions.input, Vite only processes index.html as the entry point and ignores the other pages.
            // This is the standard MPA configuration for Vite — alongside appType: 'mpa'.
            rolldownOptions: {
                input,
                // input: {
                //     index: resolve(__dirname, 'index.html'),
                //     register: resolve(__dirname, 'register.html'),
                //     dashboard: resolve(__dirname, 'dashboard.html'),
                //     admin: resolve(__dirname, 'admin.html'),
                // },
            },
            // By default Vite outputs to dist/ relative to where vite.config.js lives. If your config is at the root, dist/ is at /app/dist/.
            // If your server/index.js is at server/, then your __dirname is /app/server/.
            // If root: 'client' (above) is set without a matching outDir, Vite outputs to client/dist/ — but your Express is looking at /app/dist/.
            outDir: '../dist', // resolves to project root /dist
            emptyOutDir: true, // needed when outDir is outside root - Vite warns otherwise
        },
        server: {
            proxy: {
                // Proxy requests starting with '/api'
                '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true, // Optional: changes the origin of the host header to the target URL
                    // rewrite: (path) => path.replace(/^\/api/, ''), // Optional: rewrites the path (e.g., /api/users becomes /users)
                },
            },
        },
        appType: 'mpa', //spa for single page app (fallback to index.html), mpa for multipage (mimic real static server), custom if not including any html middlewares (eg server-side rendering)
    };
});
