-- Fix missing columns for existing self-hosted Supabase
-- Ejecutar en SQL Editor de Supabase Studio

-- Agregar columna applies_to a special_offers si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'special_offers' 
        AND column_name = 'applies_to'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.special_offers 
        ADD COLUMN applies_to VARCHAR(20) NOT NULL DEFAULT 'new' 
        CHECK (applies_to IN ('new', 'existing', 'all'));
        
        RAISE NOTICE 'Columna applies_to agregada a special_offers';
    ELSE
        RAISE NOTICE 'Columna applies_to ya existe en special_offers';
    END IF;
END $$;

-- Agregar columna billing_day a subscriptions si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscriptions' 
        AND column_name = 'billing_day'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.subscriptions 
        ADD COLUMN billing_day INTEGER 
        CHECK (billing_day >= 1 AND billing_day <= 31);
        
        RAISE NOTICE 'Columna billing_day agregada a subscriptions';
    ELSE
        RAISE NOTICE 'Columna billing_day ya existe en subscriptions';
    END IF;
END $$;

-- Refrescar el schema cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ Columnas faltantes agregadas correctamente' as status;
