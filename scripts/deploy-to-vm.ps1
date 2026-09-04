<#
.SYNOPSIS
    Deploys Phase 0 (Group Registration) to the Oracle VM and runs auto-tests.

.DESCRIPTION
    This script:
      1. Verifies SSH key exists
      2. Tests SSH connection
      3. Shows git changes to deploy
      4. Commits and pushes local changes
      5. SSHes into VM and rebuilds Docker containers
      6. Runs verification tests

.PARAMETER VMHost
    The SSH host (default: ubuntu@140.238.79.76)

.PARAMETER SSHKey
    Path to SSH private key

.PARAMETER AppDir
    App directory on the VM

.PARAMETER SkipTests
    Skip auto-tests after deployment

.EXAMPLE
    .\scripts\deploy-to-vm.ps1
    Deploys with defaults

.NOTES
    Phase 0 deployment — Windows PowerShell 5.1 compatible
#>

[CmdletBinding()]
param(
    [string]$VMHost = "ubuntu@140.238.79.76",
    [string]$SSHKey = "C:\Users\ehiji\OneDrive\Desktop\WebApps\wa-transfer\ssh-wa-transfer-backup.key",
    [string]$AppDir = "/home/ubuntu/wa-transfer",
    [switch]$SkipTests,
    [switch]$Force
)

# Helper for colored output (PowerShell 5.1 compatible)
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    $colorMap = @{
        "Green"  = "Green"
        "Yellow" = "Yellow"
        "Red"    = "Red"
        "Blue"   = "Cyan"
        "White"  = "White"
    }
    Write-Host $Text -ForegroundColor $colorMap[$Color]
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Color "============================================================" "Blue"
    Write-Color "  $Title" "Blue"
    Write-Color "============================================================" "Blue"
    Write-Host ""
}

function Write-Status {
    param([string]$Text, [string]$Status = "info")
    $color = switch ($Status) {
        "ok"   { "Green" }
        "warn" { "Yellow" }
        "err"  { "Red" }
        default { "White" }
    }
    $icon = switch ($Status) {
        "ok"   { "[OK]" }
        "warn" { "[WARN]" }
        "err"  { "[ERR]" }
        default { "[*]" }
    }
    Write-Color "$icon $Text" $color
}

# Header
Write-Section "wa-transfer Phase 0 Deployment to Oracle VM"
Write-Color "VM Host: $VMHost" "White"
Write-Color "SSH Key: $SSHKey" "White"
Write-Color "App Dir: $AppDir" "White"
Write-Host ""

# Step 1: Verify SSH key exists
Write-Status "Step 1/7: Verifying SSH key..." "info"
if (-not (Test-Path $SSHKey)) {
    Write-Status "SSH key not found at: $SSHKey" "err"
    Write-Status "Please ensure the key file exists or specify -SSHKey parameter." "err"
    exit 1
}
Write-Status "SSH key found" "ok"
Write-Host ""

# Step 2: Test SSH connection
Write-Status "Step 2/7: Testing SSH connection to $VMHost..." "info"
$testResult = ssh -i $SSHKey -o BatchMode=yes -o ConnectTimeout=10 $VMHost "echo SSH_OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Status "Cannot connect to $VMHost" "err"
    Write-Status "Details: $testResult" "err"
    exit 1
}
Write-Status "SSH connection works" "ok"
Write-Host ""

# Step 3: Show what will be deployed
Write-Status "Step 3/7: Git changes to deploy:" "info"
$localDir = (Get-Location).Path
git -C $localDir status --short
Write-Host ""

# Confirm with user
if (-not $Force) {
    Write-Color "Do you want to proceed with deployment? (Y/N)" "Yellow"
    $confirmation = Read-Host
    if ($confirmation -ne "Y" -and $confirmation -ne "y") {
        Write-Color "Deployment cancelled." "Yellow"
        exit 0
    }
}
else {
    Write-Color "Force mode: auto-accepting deployment" "Yellow"
}
Write-Host ""

# Step 4: Commit and push local changes
Write-Status "Step 4/7: Committing and pushing local changes..." "info"
$hasChanges = $null -ne (git -C $localDir status --porcelain)
if ($hasChanges) {
    git -C $localDir add -A
    $commitMessage = "Phase 0: Group Registration via WATM Good Afternoon trigger"
    git -C $localDir commit -m $commitMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Git commit failed" "err"
        exit 1
    }
    Write-Status "Changes committed" "ok"
}
else {
    Write-Status "No uncommitted changes" "ok"
}

# Push to remote
$currentBranch = git -C $localDir rev-parse --abbrev-ref HEAD
Write-Color "  Pushing branch: $currentBranch" "White"
git -C $localDir push origin $currentBranch
if ($LASTEXITCODE -ne 0) {
    Write-Status "Push failed - VM may use different branch or remote" "warn"
    Write-Status "Will continue; VM will attempt git pull anyway." "warn"
}
Write-Host ""

# Step 5: Deploy to VM
Write-Status "Step 5/7: Deploying to VM (this may take several minutes)..." "info"

# Build the SSH command using a here-string (more reliable than interpolation)
$deployScript = @"
set -e
cd $AppDir

echo '--- Pulling latest code ---'
git pull origin $currentBranch 2>&1 | tail -5

echo ''
echo '--- Stopping existing containers ---'
docker-compose down 2>&1 | tail -5

echo ''
echo '--- Building new Docker image ---'
docker-compose build 2>&1 | tail -15

echo ''
echo '--- Starting containers ---'
docker-compose up -d 2>&1 | tail -5

echo ''
echo '--- Waiting for startup (20s) ---'
sleep 20

echo ''
echo '--- Container status ---'
docker-compose ps
"@

ssh -i $SSHKey $VMHost $deployScript
if ($LASTEXITCODE -ne 0) {
    Write-Status "Deployment failed on VM" "err"
    Write-Color "Check the output above for details." "Yellow"
    exit 1
}
Write-Status "Deployment complete" "ok"
Write-Host ""

# Step 6: Run auto-tests
if (-not $SkipTests) {
    Write-Status "Step 6/7: Running auto-tests on VM..." "info"

    # Test 1: Container logs
    Write-Host ""
    Write-Color "Test 1: Last 20 lines of container logs" "Cyan"
    $logs = ssh -i $SSHKey $VMHost "cd $AppDir && docker-compose logs --tail=20 wa-transfer" 2>&1
    Write-Host $logs
    Write-Host ""

    # Test 2: CLI group list
    Write-Color "Test 2: npm run groups:list" "Cyan"
    $groupsList = ssh -i $SSHKey $VMHost "cd $AppDir && npm run groups:list" 2>&1
    Write-Host $groupsList
    Write-Host ""

    # Test 3: Health endpoint
    Write-Color "Test 3: Health endpoint check" "Cyan"
    $healthCheck = ssh -i $SSHKey $VMHost "curl -s -m 5 http://localhost:3001/health" 2>&1
    if ($healthCheck) {
        Write-Host $healthCheck
    }
    else {
        Write-Color "Health endpoint not responding yet (may still be starting)" "Yellow"
    }
    Write-Host ""

    # Test 4: Verify app process is running
    Write-Color "Test 4: Verify wa-transfer container is running" "Cyan"
    $containerCheck = ssh -i $SSHKey $VMHost "docker ps | grep -i wa-transfer" 2>&1
    if ($containerCheck -and $containerCheck -match "wa-transfer") {
        Write-Status "Container is running" "ok"
    }
    else {
        Write-Status "wa-transfer container may not be running yet" "warn"
    }
    Write-Host ""
}
else {
    Write-Color "Step 6/7: Skipping auto-tests" "Yellow"
    Write-Host ""
}

# Step 7: Report
Write-Section "Deployment Complete"
Write-Color "Phase 0 deployed successfully" "Green"
Write-Host ""
Write-Color "Next steps for end-to-end testing:" "Yellow"
Write-Host ""
Write-Color "1. Test group registration from WhatsApp:" "White"
Write-Color "   - Open WhatsApp on your phone" "White"
Write-Color "   - Go to any test group" "White"
Write-Color "   - Send the exact message: WATM Good Afternoon" "White"
Write-Color "   - Bot should stay silent (no reply)" "White"
Write-Host ""
Write-Color "2. Verify registration on VM:" "White"
Write-Color "   ssh -i `"$SSHKey`" $VMHost 'cd $AppDir && npm run groups:list'" "Cyan"
Write-Host ""
Write-Color "3. View live logs:" "White"
Write-Color "   ssh -i `"$SSHKey`" $VMHost 'cd $AppDir && docker-compose logs -f wa-transfer'" "Cyan"
Write-Host ""
Write-Color "4. Test message filtering:" "White"
Write-Color "   - Send any message in a group that was NOT registered" "White"
Write-Color "   - Check logs for 'Ignoring message from non-monitored group'" "White"
Write-Host ""
Write-Color "Ready to receive WATM Good Afternoon triggers!" "Green"
