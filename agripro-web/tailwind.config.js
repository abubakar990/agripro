/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a4d2e', // Primary Green
          light: '#2d7a4a',   // Primary Light
        },
        accent: {
          green: '#4caf50',   // Success, active states
          amber: '#856404',   // Warning, low stock
          blue: '#1565c0',    // Info blue
        },
        revenue: '#2e7d32',   // Revenue Green
        expense: '#c62828',   // Expense Red
        bg: '#f0f4f0',        // Main app background
        border: '#e0e0e0',
        text: {
          primary: '#1a1a1a',
          secondary: '#666666',
          muted: '#999999',
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
        'input': '8px',
      },
      boxShadow: {
        'card': '0 2px 10px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
}
