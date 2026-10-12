-- Remove temporary shared-calendar verification tokens.
DELETE FROM public.tv_device_tokens WHERE token_hash IN ('21b07bf650dd2fa51f7d430bcf3242483101d19dd2357932cc732783ed45df16','388ea0807cfa4896716a67406640e96317849fb6c4f56b398e1b96a2b628cc01');
