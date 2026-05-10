import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ИИ-Маркетолог — Ваш помощник в маркетинге",
  description: "ИИ-помощник для предпринимателей: целевая аудитория, офферы, реклама Яндекс.Директ, аудит и аналитика",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
