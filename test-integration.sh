#!/bin/bash

# Complete MFE Integration Test

set -e

echo "🚀 Starting Full MFE Integration Test"
echo "====================================="

# Helper functions
log_info() { echo "ℹ️  $1"; }
log_success() { echo "✅ $1"; }
log_error() { echo "❌ $1"; exit 1; }

# Kill any existing processes
log_info "Cleaning up old processes..."
pkill -f "pnpm turbo dev" || true
sleep 1

# Start MFE
log_info "Starting MFE dev server on port 5174..."
cd /Users/ali.raza/dev/mfe-runtine
pnpm turbo dev --filter '@mfe-runtine/mfe-widget' > /tmp/mfe-dev.log 2>&1 &
MFE_PID=$!

# Start Shell
log_info "Starting Shell dev server on port 5173..."
pnpm turbo dev --filter website > /tmp/shell-dev.log 2>&1 &
SHELL_PID=$!

# Wait for servers
log_info "Waiting for servers to initialize..."
sleep 5

# Test MFE
log_info "Testing MFE..."
if curl -s http://localhost:5174/remoteEntry.js | grep -q "__mf_init"; then
  log_success "MFE remoteEntry.js is valid"
else
  log_error "MFE remoteEntry.js is invalid"
fi

# Test Shell
log_info "Testing Shell..."
if curl -s http://localhost:5173/ | grep -q "app\|mf"; then
  log_success "Shell HTML loads"
else
  log_error "Shell HTML doesn't load"
fi

# Test config
log_info "Testing remotes.config.json..."
if curl -s http://localhost:5173/remotes.config.json | grep -q "mfe-widget"; then
  log_success "remotes.config.json is accessible"
else
  log_error "remotes.config.json is not valid"
fi

log_info "✨ All tests passed!"
log_info ""
log_info "The servers are still running. You can test manually:"
log_info "  • Open http://localhost:5173 in your browser"
log_info "  • Check browser console for Module Federation loading"
log_info "  • Verify widget component appears"
log_info ""
log_info "Press Ctrl+C to stop servers"

# Keep running
wait

# Cleanup on exit
trap "kill $MFE_PID $SHELL_PID 2>/dev/null || true" EXIT
