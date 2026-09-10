ALTER TABLE widget_configs
    ADD COLUMN intro_title             VARCHAR(255) NOT NULL DEFAULT 'Precise and comfortable fitting method',
    ADD COLUMN intro_description       TEXT NOT NULL DEFAULT 'Upload your photo, enter your body measurements and get accurate sizing recommendations. Try on items or entire looks with a single tap in the virtual fitting room.',
    ADD COLUMN intro_image             TEXT NOT NULL DEFAULT '/widget-preview/intro-bg.png',
    ADD COLUMN params_title            VARCHAR(255) NOT NULL DEFAULT 'Basic parameters',
    ADD COLUMN params_subtitle         VARCHAR(255) NOT NULL DEFAULT 'Specify the main parameters',
    ADD COLUMN measurements_title      VARCHAR(255) NOT NULL DEFAULT 'Your parameters',
    ADD COLUMN measurements_subtitle   TEXT NOT NULL DEFAULT 'Please provide your parameters so we can find the right size of things for you.',
    ADD COLUMN belly_title             VARCHAR(255) NOT NULL DEFAULT 'Your belly shape',
    ADD COLUMN belly_subtitle          TEXT NOT NULL DEFAULT 'Choose the image that most resembles the shape of your belly',
    ADD COLUMN figure_title            VARCHAR(255) NOT NULL DEFAULT 'Your figure type',
    ADD COLUMN figure_subtitle         TEXT NOT NULL DEFAULT 'Choose the image that best reflects your current figure';
