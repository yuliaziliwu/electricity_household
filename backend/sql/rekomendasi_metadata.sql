USE [electricity_household]
GO

IF COL_LENGTH('dbo.rekomendasi', 'kode') IS NULL
    ALTER TABLE dbo.rekomendasi ADD kode NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.rekomendasi', 'prioritas') IS NULL
    ALTER TABLE dbo.rekomendasi ADD prioritas NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.rekomendasi', 'kategori') IS NULL
    ALTER TABLE dbo.rekomendasi ADD kategori NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.rekomendasi', 'potensi_hemat') IS NULL
    ALTER TABLE dbo.rekomendasi ADD potensi_hemat DECIMAL(15,2) NOT NULL DEFAULT 0;
GO
