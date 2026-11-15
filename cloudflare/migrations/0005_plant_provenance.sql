-- Each public plant datum must be traceable.  A plant can have several sources:
-- taxonomy (scientific name) and cultivation guidance are deliberately separate.
CREATE TABLE IF NOT EXISTS plant_sources (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL REFERENCES plant_species(id),
  scope TEXT NOT NULL CHECK(scope IN ('taxonomy','cultivation','image')),
  authority TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  external_id TEXT,
  taxon_name TEXT,
  taxon_rank TEXT,
  match_confidence INTEGER,
  license_note TEXT,
  status TEXT NOT NULL DEFAULT 'review' CHECK(status IN ('verified','review','rejected')),
  retrieved_at TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(species_id, scope, authority, external_id)
);
CREATE INDEX IF NOT EXISTS plant_sources_species_scope_idx ON plant_sources(species_id, scope, status);

-- Taxonomy records were resolved on 2026-11-07 through GBIF's species-match API.
-- GBIF documents Catalogue of Life Extended Release as its primary taxonomy.
-- Cultivation fields are intentionally not marked verified here: they require a
-- crop, cultivar, climate and source-specific agronomy reference before release.
INSERT OR REPLACE INTO plant_sources
  (id,species_id,scope,authority,title,source_url,external_id,taxon_name,taxon_rank,match_confidence,license_note,status,retrieved_at,verified_at)
VALUES
('src-tax-chive-gbif','chive','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Allium tuberosum','https://www.gbif.org/species/2856297','2856297','Allium tuberosum Rottler ex Spreng.','species',97,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-lettuce-gbif','lettuce','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Lactuca sativa','https://www.gbif.org/species/7403263','7403263','Lactuca sativa L.','species',99,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-garlic-gbif','garlic','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Allium sativum','https://www.gbif.org/species/2856681','2856681','Allium sativum L.','species',99,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-bokchoy-gbif','bokchoy','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Brassica rapa subsp. chinensis','https://www.gbif.org/species/3042702','3042702','Brassica rapa subsp. chinensis (L.) Hanelt','subspecies',98,'GBIF classifies this matched taxon as a synonym of Brassica rapa L.; cultivar-level review remains required.','review','2026-11-07T00:00:00Z',NULL),
('src-tax-strawberry-gbif','strawberry','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Fragaria × ananassa','https://www.gbif.org/species/3029912','3029912','Fragaria × ananassa (Weston) Rozier','species',97,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-tomato-gbif','tomato','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Solanum lycopersicum','https://www.gbif.org/species/2930137','2930137','Solanum lycopersicum L.','species',98,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-rosemary-gbif','rosemary','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Salvia rosmarinus','https://www.gbif.org/species/10902460','10902460','Salvia rosmarinus Spenn.','species',98,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-mint-gbif','mint','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Mentha','https://www.gbif.org/species/2927173','2927173','Mentha L.','genus',94,'Only the genus is verified; do not treat this as a species or cultivar determination.','review','2026-11-07T00:00:00Z',NULL),
('src-tax-flower-gbif','flower','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Kalanchoe blossfeldiana','https://www.gbif.org/species/2985944','2985944','Kalanchoe blossfeldiana Poelln.','species',99,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-spinach-gbif','spinach','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Spinacia oleracea','https://www.gbif.org/species/3083647','3083647','Spinacia oleracea L.','species',99,'Retain source attribution; cultivation guidance is separate.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z'),
('src-tax-carrot-gbif','carrot','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Daucus carota','https://www.gbif.org/species/3034742','3034742','Daucus carota L.','species',97,'Cultivated carrot subtype/cultivar remains to be reviewed.','review','2026-11-07T00:00:00Z',NULL),
('src-tax-blueberry-gbif','blueberry','taxonomy','GBIF / Catalogue of Life Extended Release','GBIF species match: Vaccinium','https://www.gbif.org/species/2882813','2882813','Vaccinium L.','genus',94,'Only the genus is verified; blueberry cultivar/species remains to be reviewed.','review','2026-11-07T00:00:00Z',NULL);

UPDATE plant_species SET scientific_name='Allium tuberosum Rottler ex Spreng.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='chive';
UPDATE plant_species SET scientific_name='Lactuca sativa L.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='lettuce';
UPDATE plant_species SET scientific_name='Allium sativum L.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='garlic';
UPDATE plant_species SET scientific_name='Brassica rapa subsp. chinensis (L.) Hanelt', source='editorial-taxonomy-review', updated_at=CURRENT_TIMESTAMP WHERE id='bokchoy';
UPDATE plant_species SET scientific_name='Fragaria × ananassa (Weston) Rozier', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='strawberry';
UPDATE plant_species SET scientific_name='Solanum lycopersicum L.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='tomato';
UPDATE plant_species SET scientific_name='Salvia rosmarinus Spenn.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='rosemary';
UPDATE plant_species SET scientific_name='Mentha L.', source='editorial-taxonomy-review', updated_at=CURRENT_TIMESTAMP WHERE id='mint';
UPDATE plant_species SET scientific_name='Kalanchoe blossfeldiana Poelln.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='flower';
UPDATE plant_species SET scientific_name='Spinacia oleracea L.', source='editorial-taxonomy-backed', updated_at=CURRENT_TIMESTAMP WHERE id='spinach';
UPDATE plant_species SET scientific_name='Daucus carota L.', source='editorial-taxonomy-review', updated_at=CURRENT_TIMESTAMP WHERE id='carrot';
UPDATE plant_species SET scientific_name='Vaccinium L.', source='editorial-taxonomy-review', updated_at=CURRENT_TIMESTAMP WHERE id='blueberry';
