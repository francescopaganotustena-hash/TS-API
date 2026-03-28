-- TS-API local cache bootstrap for SQL Server
-- Run on the target database after choosing the schema (dbo by default).

IF OBJECT_ID('dbo.sync_jobs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.sync_jobs (
    id NVARCHAR(80) NOT NULL PRIMARY KEY,
    status NVARCHAR(20) NOT NULL,
    phase NVARCHAR(50) NOT NULL,
    progress_pct INT NOT NULL DEFAULT 0,
    processed INT NOT NULL DEFAULT 0,
    inserted INT NOT NULL DEFAULT 0,
    updated INT NOT NULL DEFAULT 0,
    errors INT NOT NULL DEFAULT 0,
    started_at DATETIME2 NOT NULL,
    updated_at DATETIME2 NULL,
    ended_at DATETIME2 NULL,
    message NVARCHAR(4000) NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_sync_jobs_status_started' AND object_id = OBJECT_ID('dbo.sync_jobs'))
BEGIN
  CREATE INDEX IX_sync_jobs_status_started ON dbo.sync_jobs(status, started_at DESC);
END;

IF OBJECT_ID('dbo.sync_meta', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.sync_meta (
    id INT NOT NULL PRIMARY KEY CHECK (id = 1),
    last_sync_at DATETIME2 NULL,
    last_success_at DATETIME2 NULL,
    last_job_id NVARCHAR(80) NULL,
    last_status NVARCHAR(20) NULL,
    message NVARCHAR(4000) NULL,
    updated_at DATETIME2 NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.sync_meta WHERE id = 1)
BEGIN
  INSERT INTO dbo.sync_meta (id, updated_at) VALUES (1, SYSUTCDATETIME());
END;

IF OBJECT_ID('dbo.sync_resource_meta', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.sync_resource_meta (
    resource NVARCHAR(50) NOT NULL PRIMARY KEY,
    updated_at DATETIME2 NULL,
    row_count INT NOT NULL DEFAULT 0,
    updated_on DATETIME2 NULL
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.sync_resource_meta WHERE resource = 'clienti')
BEGIN
  INSERT INTO dbo.sync_resource_meta (resource, updated_at, row_count, updated_on) VALUES ('clienti', NULL, 0, SYSUTCDATETIME());
END;
IF NOT EXISTS (SELECT 1 FROM dbo.sync_resource_meta WHERE resource = 'fornitori')
BEGIN
  INSERT INTO dbo.sync_resource_meta (resource, updated_at, row_count, updated_on) VALUES ('fornitori', NULL, 0, SYSUTCDATETIME());
END;
IF NOT EXISTS (SELECT 1 FROM dbo.sync_resource_meta WHERE resource = 'articoli')
BEGIN
  INSERT INTO dbo.sync_resource_meta (resource, updated_at, row_count, updated_on) VALUES ('articoli', NULL, 0, SYSUTCDATETIME());
END;
IF NOT EXISTS (SELECT 1 FROM dbo.sync_resource_meta WHERE resource = 'ordini')
BEGIN
  INSERT INTO dbo.sync_resource_meta (resource, updated_at, row_count, updated_on) VALUES ('ordini', NULL, 0, SYSUTCDATETIME());
END;
IF NOT EXISTS (SELECT 1 FROM dbo.sync_resource_meta WHERE resource = 'righeOrdine')
BEGIN
  INSERT INTO dbo.sync_resource_meta (resource, updated_at, row_count, updated_on) VALUES ('righeOrdine', NULL, 0, SYSUTCDATETIME());
END;

IF OBJECT_ID('dbo.cache_clienti', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cache_clienti (
    row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    cli_for INT NULL,
    id_cli_for INT NULL,
    ragione_sociale NVARCHAR(255) NULL,
    piva NVARCHAR(40) NULL,
    citta NVARCHAR(120) NULL,
    flg_attivo BIT NULL,
    updated_at DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NOT NULL
  );
  CREATE INDEX IX_cache_clienti_clifor ON dbo.cache_clienti(cli_for);
  CREATE INDEX IX_cache_clienti_ragione_sociale ON dbo.cache_clienti(ragione_sociale);
END;

IF OBJECT_ID('dbo.cache_fornitori', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cache_fornitori (
    row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    cli_for INT NULL,
    id_cli_for INT NULL,
    ragione_sociale NVARCHAR(255) NULL,
    piva NVARCHAR(40) NULL,
    citta NVARCHAR(120) NULL,
    flg_attivo BIT NULL,
    updated_at DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NOT NULL
  );
  CREATE INDEX IX_cache_fornitori_clifor ON dbo.cache_fornitori(cli_for);
  CREATE INDEX IX_cache_fornitori_ragione_sociale ON dbo.cache_fornitori(ragione_sociale);
END;

IF OBJECT_ID('dbo.cache_articoli', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cache_articoli (
    row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    codice_articolo NVARCHAR(80) NULL,
    descrizione NVARCHAR(400) NULL,
    ditta INT NULL,
    flg_esaurito BIT NULL,
    updated_at DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NOT NULL
  );
  CREATE INDEX IX_cache_articoli_codice ON dbo.cache_articoli(codice_articolo);
  CREATE INDEX IX_cache_articoli_descrizione ON dbo.cache_articoli(descrizione);
END;

IF OBJECT_ID('dbo.cache_ordini', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cache_ordini (
    row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    num_reg BIGINT NULL,
    num_doc NVARCHAR(60) NULL,
    tipo_doc NVARCHAR(40) NULL,
    sez_doc NVARCHAR(20) NULL,
    cli_for_fatt INT NULL,
    cli_for_dest INT NULL,
    data_doc DATETIME2 NULL,
    updated_at DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NOT NULL
  );
  CREATE INDEX IX_cache_ordini_numreg ON dbo.cache_ordini(num_reg);
  CREATE INDEX IX_cache_ordini_tipodoc ON dbo.cache_ordini(tipo_doc);
  CREATE INDEX IX_cache_ordini_cliforfatt ON dbo.cache_ordini(cli_for_fatt);
END;

IF OBJECT_ID('dbo.cache_righe_ordine', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cache_righe_ordine (
    row_id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    num_reg BIGINT NULL,
    progr_riga INT NULL,
    cod_articolo NVARCHAR(80) NULL,
    descrizione NVARCHAR(400) NULL,
    quantita DECIMAL(18, 6) NULL,
    updated_at DATETIME2 NULL,
    raw_json NVARCHAR(MAX) NOT NULL
  );
  CREATE INDEX IX_cache_righe_numreg ON dbo.cache_righe_ordine(num_reg);
  CREATE INDEX IX_cache_righe_codart ON dbo.cache_righe_ordine(cod_articolo);
END;
