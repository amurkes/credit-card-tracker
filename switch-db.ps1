# Database Switcher for Credit Card Tracker
# Usage:
#   .\switch-db.ps1 sqlite   - Switch to local SQLite
#   .\switch-db.ps1 supabase - Switch to Supabase PostgreSQL

param([string]$db)

if ($db -eq "sqlite") {
    Write-Host "[1/5] Switching to SQLite..." -ForegroundColor Cyan
    # Update .env
    (Get-Content .env) -replace 'DATABASE_URL="postgresql://postgres:.*"', '# DATABASE_URL="postgresql://postgres:..."' -replace '# DATABASE_URL="file:./prisma/dev.db"', 'DATABASE_URL="file:./prisma/dev.db"' | Set-Content .env -Encoding UTF8
    # Update schema.prisma
    (Get-Content prisma/schema.prisma) -replace 'provider = "postgresql"', 'provider = "sqlite"' | Set-Content prisma/schema.prisma -Encoding UTF8
    Write-Host "[2/5] Updated .env and schema.prisma" -ForegroundColor Green
    Write-Host "[3/5] Run: npx prisma db push" -ForegroundColor Yellow
    Write-Host "[4/5] Run: npx prisma generate" -ForegroundColor Yellow
    Write-Host "[5/5] Then restart: npm run dev" -ForegroundColor Yellow
} elseif ($db -eq "supabase") {
    Write-Host "[1/5] Switching to Supabase..." -ForegroundColor Cyan
    # Update .env
    (Get-Content .env) -replace '# DATABASE_URL="postgresql://postgres:..."', 'DATABASE_URL="postgresql://postgres:tw9GXszwcvVgOB7X@db.khroccuzsreqtlzmltkq.supabase.co:5432/postgres?schema=public"' -replace 'DATABASE_URL="file:./prisma/dev.db"', '# DATABASE_URL="file:./prisma/dev.db"' | Set-Content .env -Encoding UTF8
    # Update schema.prisma
    (Get-Content prisma/schema.prisma) -replace 'provider = "sqlite"', 'provider = "postgresql"' | Set-Content prisma/schema.prisma -Encoding UTF8
    Write-Host "[2/5] Updated .env and schema.prisma" -ForegroundColor Green
    Write-Host "[3/5] Run: npx prisma db push" -ForegroundColor Yellow
    Write-Host "[4/5] Run: npx prisma generate" -ForegroundColor Yellow
    Write-Host "[5/5] Then restart: npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "Usage: .\switch-db.ps1 [sqlite^|supabase]" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Current DATABASE_URL:" -ForegroundColor White
    Select-String "^DATABASE_URL" .env
    Write-Host "" -ForegroundColor White
    Write-Host "Current schema provider:" -ForegroundColor White
    Select-String "provider = " prisma/schema.prisma
}
