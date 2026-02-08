@echo off
REM ============================================================================
REM Database Switcher for Credit Card Tracker
REM Usage:
REM   switch-db.bat sqlite   - Switch to local SQLite
REM   switch-db.bat supabase - Switch to Supabase PostgreSQL
REM ============================================================================

if "%1"=="sqlite" (
    echo [1/4] Switching to SQLite...
    powershell -Command "(Get-Content .env) -replace '^(# Supabase PostgreSQL.*)', '# DATABASE_URL=\"postgresql://postgres:...\"' -replace '^(# SQLite.*)', 'DATABASE_URL=\"file:./prisma/dev.db\"' -replace '^# DATABASE_URL=\"postgresql://postgres:tw9GXszwcvVgOB7X@db.khroccuzsreqtlzmltkq.supabase.co:5432/postgres\"', '# DATABASE_URL=\"postgresql://postgres:tw9GXszwcvVgOB7X@db.khroccuzsreqtlzmltkq.supabase.co:5432/postgres\"' | Set-Content .env"
    echo [2/4] Done switching!
    echo [3/4] Run: npx prisma db push
    echo [4/4] Then restart dev server: npm run dev
) else if "%1"=="supabase" (
    echo [1/4] Switching to Supabase...
    powershell -Command "(Get-Content .env) -replace '^(# Supabase PostgreSQL.*)', 'DATABASE_URL=\"postgresql://postgres:tw9GXszwcvVgOB7X@db.khroccuzsreqtlzmltkq.supabase.co:5432/postgres\"' -replace '^(# SQLite.*)', '# DATABASE_URL=\"file:./prisma/dev.db\"' -replace '^# DATABASE_URL=\"file:./prisma/dev.db\"', '# DATABASE_URL=\"file:./prisma/dev.db\"' | Set-Content .env"
    echo [2/4] Done switching!
    echo [3/4] Run: npx prisma db push
    echo [4/4] Then restart dev server: npm run dev
) else (
    echo Usage: switch-db.bat [sqlite^|supabase]
    echo.
    echo Current DATABASE_URL setting:
    findstr /R \"^DATABASE_URL\" .env
)
