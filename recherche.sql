CREATE TABLE public.recherche
(
    "idClient" uuid,
    organization character varying(255),
    date timestamp with time zone,
    members_json json,
    organization_json json
)
WITH (
    OIDS = FALSE
);

ALTER TABLE public.recherche
    OWNER to ripoul;