#!/bin/bash
# Crear base de datos yjbarriles en PostgreSQL local
# PostgreSQL 14 en puerto 5432

if command -v createdb &> /dev/null; then
  createdb yjbarriles 2>/dev/null && echo "Base de datos 'yjbarriles' creada." || echo "La base de datos ya existe o hay un error."
elif [ -x "/Applications/Postgres.app/Contents/Versions/14/bin/createdb" ]; then
  /Applications/Postgres.app/Contents/Versions/14/bin/createdb yjbarriles 2>/dev/null && echo "Base de datos 'yjbarriles' creada." || echo "La base de datos ya existe o hay un error."
else
  echo "Ejecuta manualmente en tu gestor PostgreSQL: CREATE DATABASE yjbarriles;"
fi
