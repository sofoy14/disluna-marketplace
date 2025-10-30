#!/bin/bash

# Script para aplicar la migración de corrección del error de creación de usuarios
# Este script aplica la migración que soluciona el problema de RLS en las tablas de billing

echo "Aplicando migración de corrección para creación de usuarios..."

# Aplicar la migración de corrección
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20250125000005_fix_user_creation_final.sql

echo "Migración aplicada exitosamente."
echo "El error de creación de usuarios debería estar solucionado."





