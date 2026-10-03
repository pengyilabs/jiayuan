-- ============================================================================
-- F11 · Rol de técnico (1/2): nuevo valor de enum.
-- Va en su propia migración porque Postgres no permite usar un valor de enum
-- recién creado en la misma transacción en la que se añade.
-- ============================================================================
alter type public.user_role add value 'technician';
