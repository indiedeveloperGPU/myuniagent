// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadein: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        loadingBar: {
      "0%": { transform: "translateX(-100%)" },
      "100%": { transform: "translateX(100%)" },
    },
      },
      animation: {
        fadein: "fadein 0.8s ease-out forwards",
    "loading-bar": "loadingBar 2s linear infinite",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  future: {
    hoverOnlyWhenSupported: true, // ← migliora compatibilità CSS vecchi
  },
  experimental: {
    optimizeUniversalDefaults: true, // ← evita colori moderni tipo oklch()
  },
}
