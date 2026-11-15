-- Replace editorial growth/harvest wording with a source-status statement.
-- Botanical classification stays available through plant_sources; cultivation
-- text will be added only alongside a verified cultivation source.
UPDATE plant_species
SET summary='分类资料可追溯；养护资料正在按地区、品种和机构出处整理。',
    updated_at=CURRENT_TIMESTAMP;
