/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'ocean-dark': '#0f172a',
                'ocean-light': '#1e293b',
                'brand-orange': '#f97316',
            }
        },
    },
    plugins: [],
}
