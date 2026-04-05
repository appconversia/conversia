export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-0 flex-col">{children}</div>;
}
