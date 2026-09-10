-- Справочник брендов вкуса — то, что человек НОСИТ и на что равняется.
-- Осознанно НЕ связан с каталогом: «любимые бренды» это сигнал вкуса, а не
-- фильтр витрины. Человек носит Burberry — мы обязаны понять его вкус и
-- показать аналог из своего каталога, а не молчать, потому что Burberry у нас
-- нет. Раньше онбординг предлагал вшитый список из 12 марок, а потом я сузил
-- его до каталога — обе крайности неверны.
--
-- grade: world  — всемирно известные (Prada, Zara, Nike)
--        local  — локальные/региональные (12 STOREEZ, LIME)
-- Грейд нужен для будущей разметки аналогов: подбирать замену Prada и замену
-- LIME — разные задачи.
--
-- Наполняется парсингом Lamoda и Oskelly; сид ниже — стартовый минимум,
-- чтобы шаг онбординга работал уже сейчас.
CREATE TABLE taste_brands (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  grade      TEXT NOT NULL DEFAULT 'world' CHECK (grade IN ('world', 'local')),
  -- female / male / unisex — кому предлагать бренд в онбординге
  gender     TEXT NOT NULL DEFAULT 'unisex' CHECK (gender IN ('female', 'male', 'unisex')),
  -- чем меньше, тем выше в списке (популярность/узнаваемость)
  rank       INT NOT NULL DEFAULT 100,
  -- brand_id заполнит разметка аналогов: если этот бренд есть у нас в каталоге
  brand_id   BIGINT REFERENCES brands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_taste_brands_pick ON taste_brands (gender, rank);

INSERT INTO taste_brands (name, grade, gender, rank) VALUES
  -- мировой масс-маркет и мидл
  ('Zara','world','unisex',10), ('COS','world','unisex',12), ('Massimo Dutti','world','unisex',14),
  ('Mango','world','female',16), ('Uniqlo','world','unisex',18), ('H&M','world','unisex',20),
  ('& Other Stories','world','female',22), ('Arket','world','unisex',24),
  -- мировой премиум и дизайнеры
  ('TOTEME','world','female',30), ('Acne Studios','world','unisex',31), ('Ganni','world','female',32),
  ('Jacquemus','world','unisex',33), ('The Row','world','female',34), ('Khaite','world','female',35),
  ('Max Mara','world','female',36), ('Isabel Marant','world','female',37),
  ('Stella McCartney','world','female',38), ('Self-Portrait','world','female',39),
  ('ZIMMERMANN','world','female',40), ('Loro Piana','world','unisex',41),
  ('Brunello Cucinelli','world','unisex',42), ('Jil Sander','world','unisex',43),
  ('Lemaire','world','unisex',44), ('Dries Van Noten','world','unisex',45),
  -- люкс
  ('Prada','world','unisex',50), ('Miu Miu','world','female',51), ('Gucci','world','unisex',52),
  ('Saint Laurent','world','unisex',53), ('Bottega Veneta','world','unisex',54),
  ('Balenciaga','world','unisex',55), ('Dior','world','unisex',56), ('Chanel','world','female',57),
  ('Burberry','world','unisex',58), ('Alexander McQueen','world','unisex',59),
  ('Dolce & Gabbana','world','unisex',60), ('Valentino','world','female',61),
  ('Givenchy','world','unisex',62), ('Balmain','world','unisex',63), ('Celine','world','unisex',64),
  ('Hermès','world','unisex',65), ('Loewe','world','unisex',66),
  -- спорт и стрит
  ('Nike','world','unisex',70), ('adidas','world','unisex',71), ('New Balance','world','unisex',72),
  ('Asics','world','unisex',73), ('Salomon','world','unisex',74), ('Veja','world','unisex',75),
  ('Dr. Martens','world','unisex',76), ('Birkenstock','world','unisex',77),
  ('Converse','world','unisex',78), ('Vans','world','unisex',79), ('Carhartt WIP','world','unisex',80),
  ('Stone Island','world','male',81), ('C.P. Company','world','male',82), ('Moncler','world','unisex',83),
  ('Levi''s','world','unisex',84), ('Diesel','world','unisex',85),
  ('Ralph Lauren','world','unisex',86), ('Tommy Hilfiger','world','unisex',87),
  ('Calvin Klein','world','unisex',88), ('Lacoste','world','unisex',89), ('Off-White','world','unisex',90),
  -- локальные (РФ/СНГ)
  ('12 STOREEZ','local','female',100), ('USHATAVA','local','female',101), ('LIME','local','female',102),
  ('2MOOD','local','female',103), ('Charuel','local','female',104), ('TOPTOP','local','female',105),
  ('INCITY','local','female',106), ('LOVE REPUBLIC','local','female',107), ('ZARINA','local','female',108),
  ('BEFREE','local','unisex',109), ('GLORIA JEANS','local','unisex',110), ('EKONIKA','local','female',111),
  ('Sela','local','unisex',112), ('Monochrome','local','unisex',113), ('BASK','local','unisex',114),
  ('I AM Studio','local','female',115), ('Present & Simple','local','female',116),
  ('Zolla','local','unisex',117), ('Finn Flare','local','unisex',118);

-- Бренды, которые уже есть в нашем каталоге, связываем сразу: разметка
-- аналогов дальше будет опираться на эту связь.
UPDATE taste_brands tb SET brand_id = b.id
FROM brands b WHERE lower(b.name) = lower(tb.name);
