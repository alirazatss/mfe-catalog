# config-generation Delta (release channels)

## ADDED Requirements

### Requirement: Config generation SHALL support release-channel URL generation with dev fallback

The config generation system SHALL accept an optional release channel (`release-<major.minor>`). When a channel is provided, each remote's `entryUrl` SHALL point at that MFE's channel prefix (`.../<mfe-name>/release-<major.minor>/remoteEntry.js`). If the MFE has no build published under that channel prefix, the generator SHALL fall back to the MFE's floating dev pointer URL (`.../<mfe-name>/dev/remoteEntry.js`). When no channel is provided, output SHALL be unchanged from current behavior.

#### Scenario: Channel URL used when the MFE has a channel build

- **GIVEN** `mfes-dev/mfe-widget/release-4.10/remoteEntry.js` exists
- **WHEN** config is generated with channel `release-4.10`
- **THEN** the `mfe-widget` entry URL targets `mfe-widget/release-4.10/remoteEntry.js`

#### Scenario: Dev fallback when the MFE lacks a channel build

- **GIVEN** `mfe-landing-page` has no blobs under `release-4.10/`
- **WHEN** config is generated with channel `release-4.10`
- **THEN** the `mfe-landing-page` entry URL targets `mfe-landing-page/dev/remoteEntry.js`
- **AND** the generated config still validates against the manifest schema

#### Scenario: No channel means existing behavior

- **WHEN** config is generated without a channel argument
- **THEN** the output is byte-equivalent to the pre-change generator for the same inputs
