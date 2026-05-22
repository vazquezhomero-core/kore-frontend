import "./globals.css";

export const metadata = {
  title: "KORE",
  description: "IA integrada a tu negocio.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}