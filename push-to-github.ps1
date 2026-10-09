# Push script for JobsPlanet / TinyFish Careers Portal
$git = "C:\Users\Hp\.gemini\antigravity\scratch\mingit\cmd\git.exe"
$gh = "C:\Users\Hp\.tools\gh\bin\gh.exe"

$repoName = if ($args[0]) { $args[0] } else { "tinyfish-careers-portal" }
$repoUrl = "https://github.com/Mamtasahu2005/$repoName.git"

Write-Host "Configuring remote: $repoUrl" -ForegroundColor Cyan

# Check if origin exists
$remotes = & $git remote
if ($remotes -contains "origin") {
    & $git remote set-url origin $repoUrl
} else {
    & $git remote add origin $repoUrl
}

Write-Host "Staging and committing any recent changes..." -ForegroundColor Cyan
& $git add .
& $git commit -m "update: latest JobsPlanet UI and TinyFish agentic pipeline" -q 2>$null

Write-Host "Pushing to GitHub (main branch)..." -ForegroundColor Green
& $git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to $repoUrl!" -ForegroundColor Green
} else {
    Write-Host "Push failed. Please ensure the repository 'https://github.com/Mamtasahu2005/$repoName' exists on GitHub." -ForegroundColor Yellow
}
