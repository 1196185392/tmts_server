-- Kew POWO accepts the cultivated carrot subspecies. This is a taxonomy
-- correction only; it does not constitute cultivation guidance.
INSERT OR REPLACE INTO plant_sources
  (id,species_id,scope,authority,title,source_url,external_id,taxon_name,taxon_rank,match_confidence,license_note,status,retrieved_at,verified_at)
VALUES
('src-tax-carrot-kew','carrot','taxonomy','Royal Botanic Gardens, Kew — Plants of the World Online','POWO accepted name: Daucus carota subsp. sativus','https://powo.science.kew.org/taxon/77249925-1','77249925-1','Daucus carota subsp. sativus (Hoffm.) Schübl. & G.Martens','subspecies',100,'Taxonomy source only; retain source attribution.','verified','2026-11-07T00:00:00Z','2026-11-07T00:00:00Z');

UPDATE plant_species
SET scientific_name='Daucus carota subsp. sativus (Hoffm.) Schübl. & G.Martens',
    source='taxonomy-backed-cultivation-pending',
    updated_at=CURRENT_TIMESTAMP
WHERE id='carrot';
