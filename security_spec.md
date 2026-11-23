# Softlynx Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **PII Isolation**: User emails and private bookmarks/inner-circle lists live strictly in `/users/{userId}/private/{docId}` and are readable/writable ONLY by `request.auth.uid == userId`.
2. **Identity Integrity**: Every created `Post`, `Story`, `Comment`, or `ChatMessage` must set `authorId`/`senderId == request.auth.uid` and require `request.auth.token.email_verified == true`.
3. **Parent Existence (Master Gate)**: Every `Comment` requires an existing parent `/posts/{postId}`. Every `ChatMessage` requires an existing parent `/chats/{chatId}` where `request.auth.uid in parent.participantIds`.
4. **Immutable Fields**: `uid`, `id`, `authorId`, `senderId`, `postId`, `chatId`, `participantIds`, and `createdAt` can never be mutated after creation.
5. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on update.
6. **Bounded Arrays & Strings**: Every string has `.size()` caps; `waveform` <= 40 items; `participantIds` == 2 items; `innerCircleIds` <= 100 items; `bookmarkedPostIds` <= 200 items.
7. **Secure List Queries**: No blanket `allow list: if isSignedIn();`. Every `allow list` validates `resource.data` directly without `get()`/`exists()`.

## 2. The Dirty Dozen Adversarial Payloads
1. **Identity Spoofing on Post Create**: Creating a post with `authorId: "other_user"`. Must return `PERMISSION_DENIED`.
2. **Shadow Field Injection on Profile**: Creating `/users/{uid}` with extra field `isAdmin: true`. Must return `PERMISSION_DENIED`.
3. **PII Cross-Read**: User B reading `/users/userA/private/info`. Must return `PERMISSION_DENIED`.
4. **Unverified Email Write**: Creating a post when `email_verified: false`. Must return `PERMISSION_DENIED`.
5. **Path ID Poisoning**: Creating `/posts/../../../evil!id` (invalid chars or >128 bytes). Must return `PERMISSION_DENIED`.
6. **Client Timestamp Forgery**: Creating a post with a backdated client timestamp instead of `serverTimestamp()`. Must return `PERMISSION_DENIED`.
7. **Orphan Comment Create**: Creating `/posts/nonexistent_post/comments/c1`. Must return `PERMISSION_DENIED`.
8. **Chat Eavesdropping**: User C listing or reading `/chats/{chatAB}/messages/{m1}` where User C is not in `participantIds`. Must return `PERMISSION_DENIED`.
9. **Immutable Author Tampering**: Updating a post to change `authorId` or `createdAt`. Must return `PERMISSION_DENIED`.
10. **Value Poisoning on Like Update**: Updating `likesCount` to a string `"9999"` or negative number `-5`. Must return `PERMISSION_DENIED`.
11. **Array Flood (DoW)**: Submitting a `voiceBioWaveform` with 500 elements. Must return `PERMISSION_DENIED`.
12. **Blanket Scraping Inner Circle Posts**: Listing `/posts` without filtering out other users' `visibility: "inner_circle"` posts. Must return `PERMISSION_DENIED`.
