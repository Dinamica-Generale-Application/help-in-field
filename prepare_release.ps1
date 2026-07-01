# prepare_release.ps1 — Bump version, commit, tag, push
#
# Usage:
#   .\prepare_release.ps1              # patch bump: 2.0.0 → 2.0.1
#   .\prepare_release.ps1 -Bump minor  # minor bump: 2.0.0 → 2.1.0
#   .\prepare_release.ps1 -Bump major  # major bump: 2.0.0 → 3.0.0
#   .\prepare_release.ps1 -SetVersion "2.1.0"  # explicit version
#
# Tag convention: v<semver> (e.g. v2.0.1)
# Triggers: GitHub Actions deploy-dev on tag push

[CmdletBinding()]
param(
    [ValidateSet("patch", "minor", "major")]
    [string]$Bump = "patch",

    [string]$SetVersion = ""
)

$ErrorActionPreference = "Stop"

$PKG = "package.json"

# Validate explicit version
if ($SetVersion -ne "") {
    if ($SetVersion -notmatch '^\d+\.\d+\.\d+$') {
        Write-Error "Invalid version '$SetVersion'. Expected X.Y.Z"
        exit 1
    }
}

# Check file exists
if (-not (Test-Path $PKG)) {
    Write-Error "$PKG not found. Run from project root."
    exit 1
}

# Check git remote
try {
    git ls-remote 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "git error" }
} catch {
    Write-Error "Unable to communicate with Git remote"
    exit 1
}

# Ensure clean working tree
$diffOutput = git diff --quiet 2>&1
$diffCachedOutput = git diff --cached --quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Working tree is dirty. Commit or stash changes first."
    exit 1
}

$currentBranch = git rev-parse --abbrev-ref HEAD
git fetch --tags --quiet 2>$null

# Read current version from package.json
$packageJson = Get-Content $PKG -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version

if ([string]::IsNullOrEmpty($currentVersion)) {
    Write-Error "Unable to read version from $PKG"
    exit 1
}

# Calculate new version
if ($SetVersion -ne "") {
    $newVersion = $SetVersion
} else {
    $parts = $currentVersion.Split('.')
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2]

    switch ($Bump) {
        "major" { $newVersion = "$($major + 1).0.0" }
        "minor" { $newVersion = "$major.$($minor + 1).0" }
        "patch" { $newVersion = "$major.$minor.$($patch + 1)" }
    }
}

$tagName = "v$newVersion"

# Check tag doesn't already exist
$existingTag = git rev-parse -q --verify "refs/tags/$tagName" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Error "Tag already exists: $tagName"
    exit 1
}

Write-Host "Preparing release on branch: $currentBranch"
Write-Host "  Current: $currentVersion"
Write-Host "  New:     $newVersion"
Write-Host "  Tag:     $tagName"
Write-Host ""

# Update package.json
$packageJson.version = $newVersion
$packageJson | ConvertTo-Json -Depth 10 | Set-Content $PKG -Encoding UTF8 -NoNewline
# Add trailing newline
Add-Content $PKG ""

# Commit + tag + push
git add $PKG
git commit -m "chore(release): $tagName"
git tag -a $tagName -m "Release $tagName"

Write-Host "Pushing branch and tag..."
git push origin $currentBranch
git push origin $tagName

Write-Host ""
Write-Host "Done. Created and pushed: $tagName" -ForegroundColor Green
Write-Host "   GitHub Actions will deploy to DEV automatically."
Write-Host "   To promote to PROD, run the 'Promote to Production' workflow from GitHub Actions UI."
