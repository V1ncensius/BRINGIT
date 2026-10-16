/** Token warna diambil langsung dari file desain Bringit. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0d0f12', // latar terluar
          900: '#111316', // latar halaman
          850: '#15171b', // sidebar
          800: '#191c21', // kartu
          750: '#1e2228', // kepala tabel / input hover
          700: '#22262d', // badge, tombol sekunder
          600: '#2d323a', // garis / border
          500: '#3a404a',
        },
        brand: {
          DEFAULT: '#ff762e',
          600: '#f0661d',
          soft: '#33251f', // latar oranye redup (nav aktif, kartu terpilih)
          text: '#ff8a4c',
        },
        ok: { DEFAULT: '#7fd3a8', soft: '#1e3029' },
        warn: { DEFAULT: '#f5b860', soft: '#332a1c' },
        danger: { DEFAULT: '#ff7a7a', soft: '#3a2124' },
        muted: '#9aa0aa',
        subtle: '#6f7680',
      },
      borderRadius: { card: '10px' },
      boxShadow: { pop: '0 12px 40px rgba(0,0,0,.45)' },
    },
  },
  plugins: [],
};
