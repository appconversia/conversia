#!/bin/bash
# Crear base de datos whatsapibot en PostgreSQL local
# PostgreSQL 14 en puerto 5432

if command -v createdb &> /dev/null; then
  createdb whatsapibot 2>/dev/null && echo "Base de datos 'whatsapibot' creada." || echo "La base de datos ya existe o hay un error."
elif [ -x "/Applications/Postgres.app/Contents/Versions/14/bin/createdb" ]; then
  /Applications/Postgres.app/Contents/Versions/14/bin/createdb whatsapibot 2>/dev/null && echo "Base de datos 'whatsapibot' creada." || echo "La base de datos ya existe o hay un error."
else
  echo "Ejecuta manualmente en tu gestor PostgreSQL: CREATE DATABASE whatsapibot;"
fi
