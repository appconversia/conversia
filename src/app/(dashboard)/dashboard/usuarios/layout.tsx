export default function UsuariosModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-[#111B21]">Módulo Usuarios</h1>
        <p className="text-sm text-[#667781]">Gestiona usuarios colaboradores</p>
      </div>
      {children}
    </div>
  );
}
