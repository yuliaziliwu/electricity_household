IF COL_LENGTH('dbo.users', 'role') IS NULL
BEGIN
    ALTER TABLE dbo.users
    ADD role VARCHAR(50) NOT NULL
        CONSTRAINT DF_users_role DEFAULT 'end_user';
END
ELSE
BEGIN
    UPDATE dbo.users
    SET role = 'end_user'
    WHERE role IS NULL
       OR LTRIM(RTRIM(CAST(role AS VARCHAR(50)))) = ''
       OR role NOT IN ('admin', 'end_user');

    ALTER TABLE dbo.users
    ALTER COLUMN role VARCHAR(50) NOT NULL;

    DECLARE @defaultName SYSNAME;

    SELECT @defaultName = dc.name
    FROM sys.default_constraints dc
    JOIN sys.columns c ON c.default_object_id = dc.object_id
    JOIN sys.tables t ON t.object_id = c.object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = 'dbo'
      AND t.name = 'users'
      AND c.name = 'role';

    IF @defaultName IS NOT NULL
        EXEC('ALTER TABLE dbo.users DROP CONSTRAINT ' + QUOTENAME(@defaultName));

    ALTER TABLE dbo.users
    ADD CONSTRAINT DF_users_role DEFAULT 'end_user' FOR role;
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_users_role_valid'
      AND parent_object_id = OBJECT_ID('dbo.users')
)
BEGIN
    ALTER TABLE dbo.users
    ADD CONSTRAINT CK_users_role_valid
    CHECK (role IN ('admin', 'end_user'));
END;
