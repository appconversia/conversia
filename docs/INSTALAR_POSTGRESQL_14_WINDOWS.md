# Instalar PostgreSQL 14 en Windows (local)

## Opción 1: Descargar e instalar manualmente (recomendado)

1. **Descarga el instalador**
   - Entra en: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - Elige **PostgreSQL 14.x** (Windows x86-64).
   - Descarga el `.exe` (por ejemplo `postgresql-14.20-2-windows-x64.exe`).

2. **Ejecuta el instalador**
   - Haz doble clic en el `.exe`.
   - Siguiente en los pasos iniciales.
   - **Carpeta de instalación**: puedes dejar la predeterminada (ej. `C:\Program Files\PostgreSQL\14`).
   - **Componentes**: deja marcados PostgreSQL Server, pgAdmin 4 y Stack Builder (o solo Server si no quieres pgAdmin).
   - **Directorio de datos**: por defecto está bien.
   - **Contraseña del usuario `postgres`**: elige una y **anótala** (la usarás en `DATABASE_URL`).
   - **Puerto**: deja **5432**.
   - Siguiente hasta terminar.

3. **Crear la base de datos para la app**
   - Abre **pgAdmin** (o usa `psql` desde la consola).
   - Conéctate al servidor local con el usuario `postgres` y la contraseña que pusiste.
   - Clic derecho en **Databases** → **Create** → **Database**.
   - Nombre: por ejemplo `yjbarriles`.
   - Guardar.

4. **Configurar `.env` del proyecto**
   En la raíz del proyecto, en el archivo `.env`, pon:

   ```env
   DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/yjbarriles"
   ```

   Sustituye `TU_CONTRASEÑA` por la contraseña del usuario `postgres`.

5. **Aplicar el esquema y el seed**
   En la carpeta del proyecto, en una terminal:

   ```powershell
   npx prisma db push
   npx prisma db seed
   ```

---

## Opción 2: Usar winget (si el hash falla)

Si prefieres usar winget y te salió error de hash:

1. **Abrir PowerShell como administrador** (clic derecho en PowerShell → "Ejecutar como administrador").

2. **Activar la opción para omitir el hash:**
   ```powershell
   winget settings --enable InstallerHashOverride
   ```

3. **Cerrar PowerShell de administrador** y abrir una **PowerShell normal**.

4. **Instalar PostgreSQL 14:**
   ```powershell
   winget install -e --id PostgreSQL.PostgreSQL.14 --accept-source-agreements --accept-package-agreements --ignore-security-hash
   ```

5. Durante la instalación te pedirá la **contraseña del usuario `postgres`**. Anótala.

6. Luego crea la base de datos `yjbarriles` en pgAdmin y configura `DATABASE_URL` en `.env` como en los pasos 3–5 de la Opción 1.

---

## Comprobar que PostgreSQL está en marcha

- **Servicios de Windows**: busca el servicio "postgresql-x64-14" y comprueba que esté en estado "En ejecución".
- O en PowerShell (como administrador): `Get-Service postgresql*`

## Conexión de la app

Con `DATABASE_URL` en `.env` y después de `npx prisma db push` y `npx prisma db seed`, la app Next.js podrá usar PostgreSQL local en el puerto 5432.
