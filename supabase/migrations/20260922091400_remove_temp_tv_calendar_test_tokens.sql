-- Remove temporary verification tokens.
DELETE FROM public.tv_device_tokens WHERE token_hash IN ('dded5cce560ca5590edcae1735f76fd1569e543ec33271d2b6967790b009f329','2677d4f27d1e55e8fff4bcc45605d299fc8f48c3e71b5398c769648ac68eacdd');
