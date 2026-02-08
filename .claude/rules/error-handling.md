---
trigger: always_on
---

# Error Handling Protocol

## When Errors Occur

1. READ the full error message
2. IDENTIFY the root cause (not just symptoms)
3. EXPLAIN the problem before fixing
4. FIX with confidence, don't guess

## Game-Specific Error Handling

- Asset loading failures: Show loading screen with retry, don't crash
- WebGL/GPU errors: Fall back gracefully, log the issue
- Physics NaN values: Clamp and reset, log the anomaly
- Audio context blocked: Handle browser autoplay policies gracefully

## Retry Logic

- Max 3 retries before asking user
- Different error = different approach
- If stuck in a loop (3+ retries), STOP and report

## Recovery Patterns

- Dev server not starting: Check port, kill stale processes
- Import errors: Verify file paths exist
- Shader compile errors: Check GLSL/WGSL syntax, validate uniforms
- Asset 404s: Verify paths relative to public directory
