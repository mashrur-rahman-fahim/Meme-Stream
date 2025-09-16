# PowerShell script to fix database issues before migration

Write-Host "🔧 Starting database cleanup process..." -ForegroundColor Yellow

# Check if .env file exists and load it
if (Test-Path ".env") {
    Write-Host "📄 Loading .env file..." -ForegroundColor Green
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*?)=(.*)$") {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
} else {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Red
    exit 1
}

# Get connection string
$connectionString = $env:DefaultConnection
if (-not $connectionString) {
    Write-Host "❌ DefaultConnection not found in environment variables!" -ForegroundColor Red
    exit 1
}

Write-Host "🗃️  Connection string loaded" -ForegroundColor Green

try {
    # Install psql if needed (requires PostgreSQL client tools)
    Write-Host "🧹 Running duplicate cleanup script..." -ForegroundColor Yellow

    # Option 1: Using psql (if available)
    if (Get-Command psql -ErrorAction SilentlyContinue) {
        psql $connectionString -f "fix-reactions-duplicates.sql"
        Write-Host "✅ Duplicate cleanup completed via psql" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  psql not available. Please run the SQL script manually or use alternative method." -ForegroundColor Yellow
        Write-Host "SQL script location: fix-reactions-duplicates.sql" -ForegroundColor Cyan

        # Alternative: Use .NET approach
        Write-Host "🔄 Attempting to run cleanup via Entity Framework..." -ForegroundColor Yellow

        # Run EF migrations with force
        Write-Host "Running: dotnet ef database update --force" -ForegroundColor Cyan
        dotnet ef database update --force

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Migration failed. Manual intervention required." -ForegroundColor Red
            Write-Host "Please run the fix-reactions-duplicates.sql script manually on your database." -ForegroundColor Yellow
            exit 1
        }
    }

    Write-Host "🎉 Database cleanup process completed!" -ForegroundColor Green
    Write-Host "Now you can run: dotnet ef database update" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Error during database cleanup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}