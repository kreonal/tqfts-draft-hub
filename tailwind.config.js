/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ESPN-ish palette: light surfaces, hairline borders, red accent.
        ink: "#1d1d1d",
        sub: "#6c6c6c",
        faint: "#9a9a9a",
        line: "#d6d7d8",
        hair: "#e9eaeb",
        canvas: "#f2f3f5",
        row: "#fafafa",
        nav: "#1a1d21",
        navsub: "#33373d",
        espn: "#d50a0a",
        espndark: "#a50000",
        good: "#1a7f37",
        warn: "#b45309",
      },
      // ESPN's fantasy position colors.
      backgroundColor: {
        qb: "#f8719d",
        rb: "#36ced0",
        wr: "#58a7ff",
        te: "#ffaf4b",
        k: "#bd66ff",
        dst: "#c0c6cc",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["11px", "14px"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06)",
        bar: "0 -1px 8px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};
