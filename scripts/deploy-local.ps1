Write-Host "Building and starting containers..."
docker compose up --build -d

Write-Host "Services:"
docker compose ps

