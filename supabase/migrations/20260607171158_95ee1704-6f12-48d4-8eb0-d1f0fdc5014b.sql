GRANT SELECT, INSERT, UPDATE, DELETE ON public.episode_folders TO authenticated;
GRANT ALL ON public.episode_folders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episode_folder_assignments TO authenticated;
GRANT ALL ON public.episode_folder_assignments TO service_role;