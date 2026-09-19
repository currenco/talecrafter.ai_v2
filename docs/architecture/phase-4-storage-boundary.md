# Phase 4 Storage Boundary And Cloudinary Decision

Date: 2026-09-19

Status: complete.

## Decision

Cloudinary is the media provider for the new product. It offers the more useful free runway for the current image-heavy workflow because storage, delivery, and image transformation consume one managed credit pool. Neon remains the database and Auth platform, but its Object Storage proof is no longer an application dependency.

Provider selection is isolated behind the backend `ObjectStorage` contract. Domain services store provider, container, object key, MIME type, byte size, access, and lifecycle status in `app.assets`; they do not call the Cloudinary SDK directly.

## Active Media Paths

- Classic story covers and chapter images
- Interactive starter covers and pages
- Interactive continuation and resolution pages
- Authenticated `/api/v1/images/persist` requests

User avatars remain Auth-owned remote URLs. PDF exports are generated and downloaded in the browser. Neither currently creates a persistent application asset.

## Object Identity

New object paths use immutable IDs:

```text
users/{ownerId}/stories/{publicStoryId}/{purpose}-{assetId}
users/{ownerId}/uploads/{purpose}-{assetId}
```

Cloudinary may prefix these keys with `CLOUDINARY_STORY_FOLDER`. The returned provider key is stored as the durable deletion identity; the public URL is a derived delivery value written into current story payloads for compatibility.

## Safety Rules

- The backend accepts image sources only over HTTPS from approved Pollinations hosts.
- JPEG, PNG, and WebP sources are accepted, up to 15 MiB.
- Source and provider requests have explicit timeouts.
- Story generation has no temporary source-URL fallback. A required upload failure aborts creation and refunds the reserved credit.
- Multi-image uploads use bounded concurrency and remove partial provider objects on failure.
- Interactive database changes and asset records are committed in one Neon HTTP batch.
- Story and user deletion remove provider objects before deleting database ownership records.
- A failed provider deletion stops the database deletion so the object remains discoverable for retry.

## Retired Proof Path

The Phase 1 Neon Object Storage proof remains useful evidence, but its S3 script, AWS SDK packages, bucket declarations, and environment template values have been removed. Existing development proof buckets are not used by the application.

## Verification

Automated checks cover:

- Object-storage contract validation
- Stable-key upload normalization
- Rejected hosts and insecure URLs
- Unsupported MIME types and oversized bodies
- Source timeout and Cloudinary failure mapping
- Successful, missing, and failed provider deletion
- Asset identity uniqueness and ownership cascade deletion in Neon
- Live Cloudinary upload, CDN delivery, and cleanup

Private media is not an active requirement. If it becomes one, add signed delivery to the storage contract and its authorization tests before storing private objects.

## Known Follow-Up

Existing pre-Phase 4 Cloudinary URLs do not automatically receive `app.assets` records. Phase 8 may retain those URLs or import their provider keys in a controlled, repeatable job. Pollinations availability and billing are generation-provider concerns and are independent of Cloudinary persistence.
