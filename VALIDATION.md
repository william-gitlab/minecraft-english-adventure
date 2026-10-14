# Prototype validation

Validated in the prepared cloud machine on 14 October 2026. Node.js 24.19.0, Chromium 154.0.8037.57, Playwright 1.64.0. Browser tests used a 1194 × 834 touch-enabled viewport and software WebGL.

## Passed

- Frozen installation: `npm ci --cache /workspace/.npm-cache --no-audit --no-fund`.
- Production build and TypeScript check: `npm run build`.
- Eight browser scenarios in `tests/adventure.spec.ts`: actual 3D wood picking, friendly spelling correction and persistence; all ten vocabulary rewards; decoded and played bundled English audio fallback; Level 2 and Level 3 behavior; house costs and construction; spaced review and mastery; touch joystick, keyboard movement and dialog focus; tablet layouts, portrait handling and corrupt-save recovery.
- Four learning-rule scenarios in `tests/learning.spec.ts`: current-streak mastery; hinted answers; missed-word review priority; atomic building costs and partial-word gaps.
- Production-server recheck of 3D wood collection and the complete house-building scenario. Both passed. The latter verified resource deductions, all three construction stages, persisted completion, and movement into Sunshine Meadow.
- Internal HTTP requests returned the game document, ten-item vocabulary JSON and a valid wood WAV file from the production server.
- `git diff --check`.

The checks above passed across focused runs. An earlier full browser run was interrupted during construction by Vite's development hot reload while code was being updated. The initial 45-second test limit also proved too short for software WebGL. The runner now builds and tests the production bundle, with a longer cloud timeout, and the affected scenarios passed on rerun. These were test-environment interruptions; no unresolved application assertion failures remain in the executed checks.

## Not yet verified

- Playwright WebKit could not be installed: its CDN requests returned `403 Domain forbidden`. Required domains were added to the environment configuration draft; the live network policy still blocked them. No WebKit pass is claimed.
- Real iPad Safari audio, touch behavior and frame rate require a physical-device acceptance test after hosting. Desktop Chromium with a tablet viewport is not equivalent to iPad Safari.
- GitHub Pages deployment and a public HTTPS address have not been created. The manual deployment workflow is prepared, but remote push and public publication require owner authorization.
- The app preview-opening request returned `queued`; that does not confirm that the app's preview panel opened or that cloud localhost is reachable from a user's iPad.

The English pronunciation fallback contains actual generated PCM audio, not a mocked voice. Its browser test verified a nonempty, nonzero decoded signal and AudioBufferSource playback. Native Safari speech is preferred in the application but cannot be audibly verified in this Linux environment.

The separate cloud environment draft saves installation/startup instructions and the browser-download network additions. A saved draft does not apply runtime networking or publish either the prepared environment or the game.
