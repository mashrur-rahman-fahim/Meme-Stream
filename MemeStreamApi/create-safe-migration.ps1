# Create a new migration that safely handles the reactions duplicates

Write-Host "🚀 Creating safe migration for reactions cleanup..." -ForegroundColor Green

# Create new migration
dotnet ef migrations add SafeReactionsCleanup

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration created successfully!" -ForegroundColor Green
    Write-Host "📝 Please edit the migration file to include the duplicate cleanup logic." -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to create migration!" -ForegroundColor Red
    exit 1
}