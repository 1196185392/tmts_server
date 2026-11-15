-- Do not publish editorial cultivation guesses as plant facts.
-- A separate, verified cultivation source must exist before these fields can
-- be repopulated and exposed by the catalogue API.
UPDATE plant_species
SET light = NULL,
    temperature = NULL,
    container = NULL,
    source = 'taxonomy-backed-cultivation-pending',
    updated_at = CURRENT_TIMESTAMP;
