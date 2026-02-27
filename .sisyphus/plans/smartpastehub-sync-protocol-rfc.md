# SmartPasteHub Sync Protocol RFC (Phase 7)

## Goals

- Room-based authenticated relay transport.
- End-to-end encrypted clipboard payloads.
- Replay-resistant message handling.
- Deterministic ack path for delivered clipboard messages.

## Message Envelope

Defined in `src/sync/relay-client.ts` as `RelayMessage`:

- `type`: register | registered | clipboard | ack | ping | pong | error
- `roomId`: sync room identifier
- `deviceId`: sender device
- `relayAuthToken`: auth token required on register and client sends
- `payload`: encrypted clipboard payload JSON string
- `nonce`: request uniqueness
- `messageId`: unique message id
- `ackOf`: original message id when `type=ack`
- `seq`: sender-side sequence number
- `timestamp`: sender timestamp

## Pairing and Key Lifecycle

- Pairing code generated in `src/sync/pairing.ts` includes:
  - `relayUrl`
  - `roomId`
  - `relayAuthToken`
  - `secretKeyHex`
  - `keyVersion`
  - `expiresAt`
- Expired pairing codes are rejected.
- Room ID derived from key material hash helper for deterministic linkage.

## Encryption

- AES-256-GCM used for payload confidentiality and integrity (`src/sync/encryption.ts`).
- Key derivation helper (`deriveKey`) included for lifecycle upgrades.

## Relay Behavior

- Worker relay in `relay-server/src/index.ts` maintains in-memory room registry.
- First valid register call seeds room auth token; subsequent register calls must match token.
- Only registered clients can relay non-register messages.
- Relay forwards clipboard/ack events to room peers, optionally targeted by `targetDeviceId`.

## Client Sync Manager Behavior

Implemented in `src/sync/sync-manager.ts`:

- Connect -> register handshake -> `registered` state transition.
- Broadcast path encrypts clipboard payload and sends `clipboard` message.
- Incoming `clipboard` payloads are decrypted and emitted to callback.
- Replay protection: duplicate `messageId` ignored.
- Ack path: `ack` emitted for accepted clipboard messages.

## Reliability Notes

- Current implementation validates core message lifecycle and replay protection.
- Future hardening can add persistent message queue and reconnect backoff windows.
