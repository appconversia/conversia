import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentación | WhatsApiBot",
  description: "Procedimientos y manuales - Oscar Cabrera y clientes",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
