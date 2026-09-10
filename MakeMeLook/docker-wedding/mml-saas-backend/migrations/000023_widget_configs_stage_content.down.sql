ALTER TABLE widget_configs
    DROP COLUMN IF EXISTS intro_title,
    DROP COLUMN IF EXISTS intro_description,
    DROP COLUMN IF EXISTS intro_image,
    DROP COLUMN IF EXISTS params_title,
    DROP COLUMN IF EXISTS params_subtitle,
    DROP COLUMN IF EXISTS measurements_title,
    DROP COLUMN IF EXISTS measurements_subtitle,
    DROP COLUMN IF EXISTS belly_title,
    DROP COLUMN IF EXISTS belly_subtitle,
    DROP COLUMN IF EXISTS figure_title,
    DROP COLUMN IF EXISTS figure_subtitle;
