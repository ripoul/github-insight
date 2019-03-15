CREATE TABLE public.recherche
(
    "idClient" uuid NOT NULL,
    organization character varying(255) COLLATE pg_catalog."default" NOT NULL,
    date timestamp with time zone NOT NULL,
    members_json json,
    organization_json json,
    CONSTRAINT pk_recherche PRIMARY KEY ("idClient", organization, date)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE public.recherche
    OWNER to ripoul;