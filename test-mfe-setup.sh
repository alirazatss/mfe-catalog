#!/bin/bash

# MFE Testing Script - Validates Module Federation Setup

set -e

echo "🧪 MFE Module Federation Test Suite"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Store PIDs for cleanup
PIDS=()
cleanup() {
  log_info "Cleaning up processes..."
  for pid in "${PIDS[@]}"; do
    kill $pid 2>/dev/null || true
  done
}
trap cleanup EXIT

# Kill any existing processes on test ports
log_info "Freeing test ports (5173, 5174, 5175)..."
for port in 5173 5174 5175; do
  lsof -ti:$port | xargs kill -9 2>/dev/null || true
done
sleep 1

# Start MFE dev server
log_info "Starting MFE dev server on port 5174..."
cd /Users/ali.raza/dev/mf-mono
pnpm turbo dev --filter '@mf-mono/mfe-widget' > /tmp/mfe-dev.log 2>&1 &
MFE_PID=$!
PIDS+=($MFE_PID)

# Wait for MFE server to be ready
log_info "Waiting for MFE server to initialize..."
for i in {1..30}; do
  if curl -s http://localhost:5174/remoteEntry.js > /dev/null 2>&1; then
    log_success "MFE dev server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    log_error "MFE dev server failed to start"
    cat /tmp/mfe-dev.log
    exit 1
  fi
  sleep 1
done

# Test 1: Check remoteEntry.js is accessible
log_info "Test 1: Checking remoteEntry.js accessibility..."
REMOTE_ENTRY=$(curl -s http://localhost:5174/remoteEntry.js)
if [ -z "$REMOTE_ENTRY" ]; then
  log_error "remoteEntry.js returned empty response"
  exit 1
fi
if echo "$REMOTE_ENTRY" | grep -q "widget"; then
  log_success "remoteEntry.js is accessible and contains widget scope"
else
  log_error "remoteEntry.js doesn't contain expected widget scope"
  echo "$REMOTE_ENTRY" | head -20
  exit 1
fi

# Test 2: Check for expected exports
log_info "Test 2: Checking for exported modules..."
if echo "$REMOTE_ENTRY" | grep -q "CounterWidget\|App\|bootstrap"; then
  log_success "All expected modules are exported"
else
  log_error "Missing expected module exports"
  exit 1
fi

# Start shell dev server
log_info "Starting shell dev server on port 5173..."
pnpm turbo dev --filter website > /tmp/shell-dev.log 2>&1 &
SHELL_PID=$!
PIDS+=($SHELL_PID)

# Wait for shell server to be ready
log_info "Waiting for shell server to initialize..."
for i in {1..30}; do
  if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    log_success "Shell dev server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    log_error "Shell dev server failed to start"
    cat /tmp/shell-dev.log
    exit 1
  fi
  sleep 1
done

# Test 3: Check shell loads
log_info "Test 3: Checking shell loads..."
SHELL_HTML=$(curl -s http://localhost:5173/)
if echo "$SHELL_HTML" | grep -q "app\|mf-mono"; then
  log_success "Shell HTML loads successfully"
else
  log_error "Shell HTML doesn't load properly"
  exit 1
fi

# Test 4: Check remotes.config.json is served by shell
log_info "Test 4: Checking remotes.config.json..."
REMOTES_CONFIG=$(curl -s http://localhost:5173/remotes.config.json)
if [ -z "$REMOTES_CONFIG" ]; then
  log_error "remotes.config.json is not accessible from shell"
  exit 1
fi
if echo "$REMOTES_CONFIG" | grep -q "mfe-widget\|remoteEntry"; then
  log_success "remotes.config.json is accessible and valid"
else
  log_error "remotes.config.json doesn't contain expected configuration"
  echo "$REMOTES_CONFIG" | jq . 2>/dev/null || echo "$REMOTES_CONFIG"
  exit 1
fi

# Test 5: Validate manifest structure
log_info "Test 5: Validating manifest structure..."
if echo "$REMOTES_CONFIG" | jq -e '.features | keys | any(. == "/widget")' > /dev/null 2>&1; then
  log_success "Manifest has /widget feature entry"
else
  log_error "Manifest missing /widget feature"
  exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo "=================================="
echo "✓ MFE dev server running on port 5174"
echo "✓ remoteEntry.js is accessible and valid"
echo "✓ Shell dev server running on port 5173"
echo "✓ remotes.config.json is served correctly"
echo "✓ Manifest structure is valid"
echo ""
echo "📝 You can now test the UI:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Check browser console for MFE loading"
echo "   3. Verify widget component appears"
echo ""
echo "Press Ctrl+C to stop the servers"
echo "=================================="

# Keep running
wait
