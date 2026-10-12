-- Indonesian/English launcher localization.
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS default_language TEXT NOT NULL DEFAULT 'id'
CHECK (default_language IN ('id', 'en'));

ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS hero_messages_en JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tv_devices.default_language IS 'Default launcher language: id or en.';
COMMENT ON COLUMN public.tv_devices.hero_messages_en IS 'English rotating launcher headlines; Indonesian headlines remain in hero_messages.';

UPDATE public.tv_devices
SET hero_messages_en = '[
  "Welcome to the GESIT meeting room.",
  "More comfortable meetings, faster collaboration.",
  "Connect, present, and start your meeting."
]'::jsonb
WHERE jsonb_array_length(hero_messages_en) = 0;

UPDATE public.tv_devices
SET input_sources = COALESCE((
  SELECT jsonb_agg(
    source || jsonb_build_object(
      'label_en', CASE
        WHEN source->>'label' = 'Poly' THEN 'Poly'
        WHEN source->>'label' = 'Direct Laptop' THEN 'Direct Laptop'
        WHEN source->>'label' = 'Laptop' THEN 'Laptop'
        WHEN source->>'label' = 'AirPlay' THEN 'AirPlay'
        ELSE source->>'label'
      END
    ) ORDER BY ordinal
  )
  FROM jsonb_array_elements(input_sources) WITH ORDINALITY AS entries(source, ordinal)
), input_sources)
WHERE jsonb_typeof(input_sources) = 'array';
