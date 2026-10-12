-- Remove temporary calendar verification tokens.
DELETE FROM public.tv_device_tokens WHERE token_hash IN ('c782b57dc95f0af35d4b3271b893d40e87f448a626744eac907f1dd256d3ed39','eeb07906a2d7b33eac01d7006d5a4792316565c397730135f268903eca8bdf0e');
