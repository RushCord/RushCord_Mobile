# RushCord Mobile Backend Mapping

Mobile must follow backend contracts from `RushCord-Backend` exactly.

## Auth

- `POST /api/auth/register`
  - request: `{ displayName, email, password }`
  - response: `{ userSub, pendingConfirmation }`
  - mobile flow: register only, then navigate to confirmation

- `POST /api/auth/confirm`
  - request: `{ email, otpCode }`
  - response: `{ confirmed: true }`

- `POST /api/auth/resend-confirmation`
  - request: `{ email }`
  - response: `{ sent: true }`

- `POST /api/auth/login`
  - request: `{ email, password }`
  - response: `{ accessToken, refreshToken, ... }`
  - mobile flow: save tokens, then call `/api/auth/check`

- `POST /api/auth/refresh`
  - request: `{ refreshToken }`
  - response: `{ accessToken, refreshToken? }`

- `POST /api/auth/logout`
  - headers: `Authorization: Bearer <accessToken>`
  - request: `{ refreshToken? }`

- `GET /api/auth/check`
  - headers: `Authorization: Bearer <accessToken>`
  - response: current public user profile

- `PUT /api/auth/update-profile`
  - headers: `Authorization: Bearer <accessToken>`
  - request: `{ profilePic }`
  - note: `profilePic` must be a public media URL from backend presigned upload flow

## Media

- `POST /api/media/presigned-upload`
  - headers: `Authorization: Bearer <accessToken>`
  - request: `{ purpose, fileName, contentType, contentLength }`
  - response: `{ uploadUrl, publicUrl, key, expiresAt }`
  - mobile flow:
    1. ask backend for presigned upload
    2. upload binary directly to `uploadUrl`
    3. send `publicUrl` and `key` into message/profile APIs

## Messages

- `GET /api/messages/users`
  - sidebar/contact list

- `GET /api/messages/:id`
  - fetch direct messages with the selected user

- `POST /api/messages/send/:id`
  - text:
    - `{ text }`
  - single file/image:
    - `{ text?, fileUrl, s3Key, mimeType, fileName, sizeBytes }`
  - multiple images:
    - `{ text?, images: [{ fileUrl, s3Key, mimeType, fileName, sizeBytes }] }`

- `PUT /api/messages/recall/:id`
  - recall for everyone

- `PUT /api/messages/recall-me/:id`
  - hide message only for current user

- `POST /api/messages/forward`
  - request: `{ messageId, receiverId }`

## Socket

Socket server requires auth token in handshake:

- connect:
  - `io(SOCKET_URL, { auth: { token: accessToken } })`

Events used by mobile:

- presence:
  - receive `getOnlineUsers`

- chat:
  - receive `newMessage`
  - emit `typing`
  - emit `stopTyping`

- recall:
  - receive `messageRecalled`
  - receive `messageRecalledMe`

- call signaling:
  - emit `callUser`
  - receive `incomingCall`
  - emit `answerCall`
  - receive `callAnswered`
  - emit/receive `iceCandidate`
  - emit/receive `hangup`
