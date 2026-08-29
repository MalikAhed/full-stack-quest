import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: http-contract-mission -->
# HTTP is a contract

Yesterday you followed a request from a browser to a server and a response back. Today you will learn to **judge that exchange**.

An [[term: HTTP contract | The shared meaning that a client and server assign to a method, target, headers, status, and body.]] answers questions such as:

- Is this request reading, creating, replacing, changing, or deleting something?
- If the connection fails, is retrying safe from duplicate effects?
- Did the server succeed, reject the input, deny access, or fail?
- What format is the body, and how should the receiver interpret it?

That judgment matters because an API can return a body that *looks* useful with the wrong status, or a status that claims success when the operation actually failed. AI-generated code is an untrusted draft here: you must compare its behavior with the contract.

By the end of today, you will be able to:

- choose among \`GET\`, \`POST\`, \`PUT\`, \`PATCH\`, and \`DELETE\` from the intended operation;
- explain **safe**, **idempotent**, and **stateless** precisely;
- read the start line, headers, blank line, and body of an HTTP message;
- select the specified success, redirect, client-error, or server-error status for a scenario;
- distinguish \`401\` from \`403\`; and
- predict a response, run a request, then explain discrepancies from evidence.

:::remember Today's finish line
For a duplicate email during account creation, say **409 Conflict** immediately. Explain \`401\` as “I don't know who you are” and \`403\` as “I know who you are; you cannot do this.” Do not use the word *authorization* in your \`401\` sentence.
:::

## Your four-hour route

- **0:00–1:00 — Read:** MDN's HTTP overview, messages, and request methods.
- **1:00–1:30 — Retrieve:** skim the status-code reference, close it, and reproduce today's table from memory.
- **1:30–1:40 — Break.**
- **1:40–2:50 — Predict, then run:** complete the nine-request drill.
- **2:50–3:00 — Break.**
- **3:00–3:40 — Diagnose:** redo misses and explain each mismatch.
- **3:40–4:00 — Speak:** explain idempotency, statelessness, \`401\`, and \`403\` aloud.

:::note Deliberate boundary
Today covers only five everyday methods, the listed status codes, five headers, JSON bodies, and safe versus idempotent behavior. Browser preflight may send \`OPTIONS\` before some cross-origin requests; you will learn why in Week 9. Other methods, other status codes, cache validators, compression, deep content negotiation, and cookie attributes belong later.
:::

<!-- lesson-step -->
<!-- step-id: methods-express-intent -->
# A method states the requested intent

An HTTP [[term: method | A token in a request start line that states the action the client wants performed on the target resource.]] is not merely a label. It communicates an intended contract to servers, browsers, tools, caches, and other developers.

Imagine an API where \`/tasks\` is the collection and \`/tasks/42\` is one task:

| Method | Intended operation | Example | Important property |
| --- | --- | --- | --- |
| \`GET\` | Read a resource without asking the server to change it. | Read task 42. | **Safe** and idempotent. |
| \`POST\` | Submit data, commonly to create a new resource. | Create a task in the collection. | Usually **not idempotent**. |
| \`PUT\` | Replace the target resource with the supplied representation. | Replace all stored fields of task 42. | **Idempotent**. |
| \`PATCH\` | Apply a partial update to the target. | Change only task 42's title. | Not guaranteed to be idempotent. |
| \`DELETE\` | Remove the target resource. | Delete task 42. | **Idempotent**. |

[[term: safe method | A method whose requested meaning is read-only: the client is not asking for server state to change.]] does not mean “nothing anywhere changes.” A server may still log the request or update metrics. It means the client did not request a business-state change. \`GET /tasks/42\` should not charge a card, send an email, or delete the task.

:::warning The method is a promise, not enforcement
HTTP cannot stop application code from deleting data during a \`GET\`. That implementation would violate the method's meaning. Review endpoint code by asking what it actually changes, not only what verb appears in the route.
:::

## Replace versus partially update

Suppose task 42 currently is:

\`{ "id": 42, "title": "Ship", "done": false }\`

A \`PUT /tasks/42\` with a complete replacement describes what the whole resource should become. A \`PATCH /tasks/42\` such as \`{ "done": true }\` asks to change only part of it. Real APIs document their exact update rules, so read that API's contract instead of assuming omitted fields behave identically everywhere.

:::mcq
id: choose-update-method
title: Choose the operation contract
question: A profile already exists at /users/7. The client sends only a new displayName and wants every other field left unchanged. Which method best communicates that intent?
- [ ] get | \`GET\`
- [ ] post | \`POST\`
- [ ] put | \`PUT\`
- [x] patch | \`PATCH\`
- [ ] delete | \`DELETE\`
explanation: \`PATCH\` communicates a partial update. \`PUT\` communicates replacement of the target representation.
hint: Ask whether the payload describes the whole resource or only the changed part.
:::

<!-- step-id: idempotency-and-retries -->
# Idempotency is about repeated effects

[[term: idempotent method | A method whose intended effect on server state is the same after multiple identical requests as after one.]] answers a practical retry question.

> If the same request reaches the server five times, is the intended final server state the same as if it arrived once?

## Why \`POST\` usually is not idempotent

Send this creation request once:

\`POST /tasks { "title": "Ship" }\`

The server may create task 43. Send the identical request five times and it may create five tasks. Each request asks the collection to create another member, so the effect can accumulate.

## Why \`PUT\` is idempotent

Send this replacement once:

\`PUT /tasks/42 { "title": "Ship", "done": false }\`

Task 42 ends in that state. Send the same replacement five times and task 42 still ends in that same state. Logs or timestamps may differ, and later responses may differ, but the **intended effect** is unchanged.

## Why \`DELETE\` is idempotent

After one \`DELETE /tasks/42\`, task 42 is absent. After five identical deletes, it is still absent. The first response might report success while a later response reports that the resource is already missing. Idempotency concerns the intended final state, not identical response bodies or status codes.

\`PATCH\` depends on the patch operation. “Set \`done\` to \`true\`” can repeat without changing the final result. “Increase \`points\` by 1” accumulates effects. Therefore, do not assume every \`PATCH\` is idempotent.

:::remember The interview definition
Idempotent means that applying the same request multiple times has the same intended effect on server state as applying it once. It does **not** mean “the response is identical.”
:::

:::mcq
id: retry-after-lost-response
title: Reason about an uncertain retry
question: A client sends a request, but the connection closes before the response arrives. Which request contract most clearly permits an automatic retry without creating a second resource?
- [ ] post-collection | \`POST /tasks\` to create a new task
- [x] put-target | \`PUT /tasks/42\` to replace task 42 with the same complete representation
- [ ] patch-increment | \`PATCH /tasks/42\` with “increase attempts by 1”
explanation: Repeating the same \`PUT\` replacement has the same intended final effect as sending it once. The creation and increment operations can accumulate.
hint: Imagine the first request actually succeeded, even though its response was lost. What happens if the request runs again?
:::

<!-- lesson-step -->
<!-- step-id: stateless-request-boundary -->
# Each request must stand on its own

HTTP is [[term: stateless | Each request is interpreted independently; the protocol does not automatically link it to earlier requests.]]. A second request does not inherit facts merely because the same client sent a first request.

Consider two requests:

1. \`POST /login\` proves identity and receives a credential.
2. \`GET /account\` asks for private account data.

The second request must carry what the server needs to identify the caller—perhaps a cookie or an \`Authorization\` header. “I logged in one request ago” is not part of the second HTTP message.

That simple model needs one refinement: **HTTP is stateless, but applications can maintain state.** A server may store a session in a database or memory, and a cookie can carry a session identifier that lets the server look it up. Alternatively, a signed token can carry claims that the server verifies. Either way, the current request contains the information needed to continue the conversation.

In Week 12, you will use JSON Web Tokens (JWTs): each protected request can carry a token rather than depending on the HTTP connection to remember a login. A token does not make the entire application stateless; databases, revoked-token lists, carts, and other application data can still be stored server-side.

:::mcq
id: statelessness-transfer
title: Apply the stateless boundary
question: A login request succeeded. The next request to /account contains no cookie, token, or other identity evidence. What should the server assume from HTTP alone?
- [ ] same-user | It must remember that this network connection belongs to the signed-in user.
- [x] no-inherited-identity | The new request does not automatically inherit the earlier request's identity.
- [ ] public-account | Every account endpoint becomes public after one successful login.
explanation: HTTP does not automatically link the requests. The current protected request needs credentials or a reference to server-held session state.
hint: Inspect only what the second request carries; do not smuggle facts across the request boundary.
:::

<!-- step-id: message-anatomy -->
# Read every message in four regions

For learning, use the readable HTTP/1.1 form. HTTP/2 and HTTP/3 encode messages differently on the wire, but the method, status, headers, and body keep their meaning.

Both requests and responses follow this conceptual shape:

> **start line → headers → blank line → optional body**

Here is a request to create a task:

\`\`\`http title=create-task-request.http
POST /tasks HTTP/1.1
Host: api.example.test
Content-Type: application/json
Accept: application/json
Authorization: Bearer token-goes-here

{"title":"Ship the lesson"}
\`\`\`

1. **Start line:** \`POST /tasks HTTP/1.1\` states the method, request target, and protocol version.
2. **Headers:** named metadata describes the message and the client's preferences or credentials.
3. **Blank line:** marks the end of the headers.
4. **Body:** contains the JSON being submitted.

The response uses the same four-region shape:

\`\`\`http title=create-task-response.http
HTTP/1.1 201 Created
Content-Type: application/json
Set-Cookie: session=opaque-value

{"id":43,"title":"Ship the lesson"}
\`\`\`

Its start line is a **status line**: protocol version, numeric status, and a human-readable reason phrase. The status communicates the outcome; the body carries a representation or error details when present.

Not every message has a body. A successful \`DELETE\` commonly returns \`204 No Content\`, followed by headers and the blank line, with no response body after it.

:::sequence
id: message-region-order
title: Reconstruct an HTTP message
question: Put the conceptual regions of an HTTP request or response in order.
- [3] blank-line | Blank line ending the header section
- [1] start-line | Start line describing the request or response
- [4] body | Optional body carrying content
- [2] headers | Zero or more metadata headers
explanation: Both requests and responses are read as start line, headers, blank line, then an optional body.
hint: Metadata belongs between the first line and the empty separator.
:::

<!-- step-id: headers-carry-context -->
# Headers explain how to handle the message

A [[term: header | A named piece of metadata sent with an HTTP request or response.]] does not replace the method, status, or body. It adds context.

| Header | Usual direction | Question it answers |
| --- | --- | --- |
| \`Content-Type\` | Request or response | “What media type is the body I am sending?” |
| \`Accept\` | Request | “Which response media types can this client handle?” |
| \`Authorization\` | Request | “What credentials is the client presenting?” |
| \`Set-Cookie\` | Response | “What cookie should the client store for later requests?” |
| \`Cache-Control\` | Request or response | “What caching rules apply?” Know that it exists; caching details come later. |

[[term: media type | A standardized label for the format of content, such as application/json or text/html.]] is carried in \`Content-Type\`. For a JSON request body, send:

\`Content-Type: application/json\`

That says what the bytes **are**. By contrast, \`Accept: application/json\` says what format the client would like back. Sending \`Accept\` does not label the request body.

\`Authorization\` often carries a scheme and credential, such as \`Bearer …\`. Treat credentials as secrets: do not paste real values into lesson notes or screenshots. Despite its name, this header normally supplies **authentication credentials**; the server still decides what the identified caller may do.

\`Set-Cookie\` travels from server to client. A later request may send the stored cookie back, letting an application connect otherwise independent requests. Cookie security attributes are deliberately deferred to Day 80.

<!-- lesson-step -->
<!-- step-id: json-needs-a-label -->
# JSON syntax and HTTP metadata solve different problems

[[term: JSON | JavaScript Object Notation: a text format for structured values such as objects, arrays, strings, numbers, booleans, and null.]] can represent a task like this:

\`{ "title": "Ship", "done": false }\`

Valid JSON text in the body is only half the contract. The receiving server also needs the HTTP metadata that identifies the body's format.

Compare these requests:

\`\`\`http title=unlabelled-body.http highlight=1,4
POST /tasks HTTP/1.1
Host: api.example.test

{"title":"Ship"}
\`\`\`

\`\`\`http title=json-body.http highlight=3
POST /tasks HTTP/1.1
Host: api.example.test
Content-Type: application/json

{"title":"Ship"}
\`\`\`

The bodies contain the same characters, but only the second request declares JSON. Without the JSON \`Content-Type\`, a framework may leave the body unparsed, treat it as another format, or reject the request. Exact behavior depends on the server and middleware configuration.

On Day 61, Express's JSON body-parsing middleware will make this consequence visible: correctly labelled JSON can become a JavaScript value in the request handler; incorrectly labelled content may not.

:::mcq
id: content-type-versus-accept
title: Label the bytes being sent
question: A client sends a JSON request body and also wants JSON back. Which pair communicates both facts?
- [ ] accept-only | Only \`Accept: application/json\`
- [ ] content-only | Only \`Content-Type: application/json\`
- [x] both-json | \`Content-Type: application/json\` and \`Accept: application/json\`
- [ ] authorization-json | \`Authorization: application/json\` and \`Set-Cookie: application/json\`
explanation: \`Content-Type\` labels the body being sent; \`Accept\` states the preferred response format.
hint: One header describes the current body, while the other describes the desired response.
:::

<!-- step-id: success-and-redirect-statuses -->
# A status code reports the outcome

The response [[term: status code | A three-digit number in the response start line that communicates the result of handling a request.]] is part of the API contract. Do not judge success from the body alone.

## Success and redirects

| Status | Use it when | Body expectation |
| --- | --- | --- |
| \`200 OK\` | A \`GET\` succeeded, or a \`PUT\`/\`PATCH\` succeeded and returns a representation or result. | Usually has a body for today's cases. |
| \`201 Created\` | A successful \`POST\` created a new resource. | Often describes the created resource. |
| \`204 No Content\` | An operation succeeded and intentionally returns no body; use it here for a successful \`DELETE\`. | **No body.** |
| \`301 Moved Permanently\` | The resource has a permanent new location. | The client follows the redirect target, often automatically. |
| \`302 Found\` | The resource is temporarily available at another location. | The client follows the redirect target, often automatically. |

A redirect is a response, not teleportation. The client receives the redirect and usually makes another request to the new location. In DevTools, **Preserve log** keeps both exchanges visible. Command-line \`curl\` shows the first response with \`-i\`; add \`-L\` when you intentionally want it to follow redirects.

:::mistake A success-looking body does not override the status
Suppose login fails but an endpoint returns \`200 OK\` with \`{"success":false}\`. The body admits failure while the status claims the request succeeded. Client code, monitoring, and generated UI logic may treat it as success. Catch the broken contract and choose the appropriate failure status.
:::

<!-- step-id: client-and-server-errors -->
# Error statuses locate the kind of failure

These are the error codes to master today:

| Status | Precise working meaning | Example |
| --- | --- | --- |
| \`400 Bad Request\` | The request is malformed or cannot be processed as a valid request. | Broken JSON syntax. |
| \`401 Unauthorized\` | The request lacks valid authentication credentials. | No login credential, or an invalid/expired credential. |
| \`403 Forbidden\` | The server recognizes the caller but refuses the action. | A signed-in member tries an admin-only action. |
| \`404 Not Found\` | The target resource cannot be found. | \`GET /tasks/99999\` when that task does not exist. |
| \`409 Conflict\` | The request conflicts with the resource's current state or a uniqueness rule. | Signup uses an email that already exists. |
| \`422 Unprocessable Content\` | The request is structurally well-formed, but its content is semantically invalid. | A valid JSON signup body contains a password that violates the documented rule. |
| \`500 Internal Server Error\` | The server encountered an unexpected failure while handling the request. | Application code throws unexpectedly. |

## Separate syntax, meaning, and state

Use this progression for common input problems:

- **Can the request be parsed as required?** If not, \`400\`.
- **Is it well-formed but a value violates the operation's rules?** Use \`422\`.
- **Would it be valid except that it clashes with current server state?** Use \`409\`.

An API's published contract is the final authority for its endpoints, but these distinctions let you detect vague or misleading designs.

:::mcq
id: duplicate-email-status
title: Choose the conflict status
question: A well-formed account-creation request uses an email that already belongs to an account. Which status best communicates the failure?
- [ ] ok | \`200 OK\`
- [ ] bad-json | \`400 Bad Request\`
- [x] conflict | \`409 Conflict\`
- [ ] server-error | \`500 Internal Server Error\`
explanation: The request conflicts with the current uniqueness state: that email is already registered. This is \`409 Conflict\`.
hint: The JSON is valid and the server did not crash; the request clashes with an existing resource.
:::

<!-- step-id: authentication-versus-permission -->
# 401 and 403 answer different questions

[[term: authentication | Establishing who a caller is, usually by validating a credential.]] comes before [[term: authorization | Deciding what an identified caller is allowed to do.]]. The similar words cause real UI and API bugs, so anchor them to two separate questions.

## \`401 Unauthorized\`: who are you?

Use \`401\` when the request does not provide valid proof of identity.

> **401 sentence:** “I don't know who you are; provide valid credentials.”

The official reason phrase says “Unauthorized,” but the working meaning is **unauthenticated**. Notice that the required sentence above does not use the word *authorization*.

## \`403 Forbidden\`: may this known caller do this?

Use \`403\` when the server knows the caller's identity but refuses the action.

> **403 sentence:** “I know who you are; you are not allowed to perform this action.”

Examples:

- Missing or invalid token for \`GET /account\` → \`401\`.
- Signed-in non-admin tries \`DELETE /admin/users/7\` → \`403\`.

:::mcq
id: authentication-status-check
title: Identify the missing identity
question: A protected endpoint receives no credentials, so the server cannot identify the caller. Which response fits?
- [x] unauthenticated | \`401 Unauthorized\`
- [ ] forbidden | \`403 Forbidden\`
- [ ] missing | \`404 Not Found\`
- [ ] conflict | \`409 Conflict\`
explanation: \`401\` means valid authentication evidence is missing: the server does not know who the caller is.
hint: This failure happens before the server can evaluate the permissions of a known identity.
:::

:::mcq
id: forbidden-status-check
title: Identify denied permission
question: The server validates Mira's login, but Mira's member role cannot access an admin report. Which response fits?
- [ ] unauthenticated | \`401 Unauthorized\`
- [x] forbidden | \`403 Forbidden\`
- [ ] missing | \`404 Not Found\`
- [ ] invalid-content | \`422 Unprocessable Content\`
explanation: The identity is known, but the identified user lacks permission for the action, so the response is \`403 Forbidden\`.
hint: The server already answered “who?” Now it is answering “may this caller do that?”
:::

<!-- lesson-step -->
<!-- step-id: status-memory-table -->
# Retrieve the status table from memory

Spend 30 minutes on the [MDN status-code reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status). Skim for today's codes, then **close the page** and reproduce this table on paper or in a plain text file.

| Scenario | Status |
| --- | --- |
| Successful read or update with a returned result | \`200 OK\` |
| Successful creation | \`201 Created\` |
| Successful deletion with an empty body | \`204 No Content\` |
| Permanent or temporary redirect | \`301 Moved Permanently\` / \`302 Found\` |
| Malformed request | \`400 Bad Request\` |
| Caller is not authenticated | \`401 Unauthorized\` |
| Known caller is denied | \`403 Forbidden\` |
| Resource is missing | \`404 Not Found\` |
| Request conflicts with current state | \`409 Conflict\` |
| Well-formed content is semantically invalid | \`422 Unprocessable Content\` |
| Unexpected server failure | \`500 Internal Server Error\` |

Check your reconstruction against the table only after finishing. Circle every miss; those become inputs to the final redo block.

## Use MDN with four questions

During the first hour, read:

1. [Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)
2. [HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages)
3. [HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods)

For each page, answer:

- What contract does this feature communicate?
- Which part belongs to the request, and which to the response?
- What would a misleading implementation make a client predict incorrectly?
- What evidence would I inspect in \`curl -i\` or DevTools?

Do not expand today's notes with unrelated methods, status codes, or caching details.

<!-- lesson-step -->
<!-- step-id: predict-then-run-protocol -->
# Build: predict before the network answers

The goal is not to make nine requests. The goal is to expose your model **before** output can influence it.

Create a text file with this record for every case:

\`\`\`text title=http-predictions.txt
Case:
Predicted status:
Predicted response header (name and likely value/category):
Reason from the contract:
Observed status:
Observed response header:
Observed body or redirect evidence:
Explanation of any difference:
\`\`\`

Use \`curl -i\` so response headers are included. In a browser, use DevTools → Network, enable **Preserve log**, select a request, and inspect its Headers and Response panels.

:::warning Public services are evidence, not specifications
JSONPlaceholder, httpbin, Postman Echo, and GitHub can change, throttle, fail, or implement teaching-friendly behavior that does not persist data. Predict from HTTP semantics first; then record the service's actual response without forcing it to match your prediction.
:::

## Cases 1–4: read, miss, create, delete

Before running each command, write the predicted status and one response header.

\`\`\`bash title=cases-1-to-4.sh
# 1
curl -i https://jsonplaceholder.typicode.com/posts/1

# 2
curl -i https://jsonplaceholder.typicode.com/posts/99999

# 3
curl -i -X POST https://jsonplaceholder.typicode.com/posts \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"hi"}'

# 4
curl -i -X DELETE https://jsonplaceholder.typicode.com/posts/1
\`\`\`

Contract-based starting predictions are \`200\` for a successful \`GET\`, \`404\` for a missing resource, \`201\` for creation, and \`204\` for a successful deletion with no body. Cases 3 and 4 may reveal different service behavior. If they do, capture the evidence and explain that the public API's implementation differs from the contract you would design.

<!-- lesson-step -->
<!-- step-id: drill-errors-and-content-types -->
# Cases 5–8: errors and body interpretation

Again, predict first.

\`\`\`bash title=cases-5-to-8.sh
# 5
curl -i https://httpbin.org/status/404

# 6
curl -i https://httpbin.org/status/500

# 7 — no explicit Content-Type
curl -i -X POST https://httpbin.org/post -d '{"a":1}'

# 8 — explicitly labelled JSON
curl -i -X POST https://httpbin.org/post \\
  -H 'Content-Type: application/json' \\
  -d '{"a":1}'
\`\`\`

If httpbin is unavailable, replace its post URL with \`https://postman-echo.com/post\` for cases 7 and 8. For cases 5 and 6, you can still document the outage and retry later; do not substitute an unrelated response and call it equivalent.

For cases 7 and 8, compare:

- the request \`Content-Type\` shown by the echo service;
- the place where the service reports parsed form-like data versus parsed JSON;
- the raw body it reports; and
- whether your shell preserved the JSON characters you intended to send.

With \`curl -d\` and no explicit \`Content-Type\`, curl commonly labels the body as form data. With \`Content-Type: application/json\`, the same bytes are declared as JSON. Echo-service response field names can change, so describe what you observe instead of memorizing one response shape. This is the behavior you will revisit with \`express.json()\` on Day 61.

<!-- lesson-step -->
<!-- step-id: redirect-chain-evidence -->
# Case 9: make the redirect chain visible

Open DevTools → Network and enable **Preserve log**. Then visit:

\`http://github.com\`

Notice the \`http\` scheme. Inspect every navigation row and answer:

1. Did the browser send an HTTP request, upgrade internally, or show some other behavior?
2. If a redirect response appears, what status did it use?
3. What response header identifies the next location?
4. What is the final URL and status?

You can compare the command line:

\`\`\`bash title=redirect-inspection.sh
# Show the first response and its headers.
curl -i http://github.com

# Follow redirects and show each response in the chain.
curl -iL http://github.com
\`\`\`

Do not assume a permanent redirect will always appear. Browser HTTPS-upgrade policy, network intermediaries, and the site's current configuration can change what you observe. Your report should say what the evidence showed.

:::mcq
id: redirect-chain-reasoning
title: Explain two navigation rows
question: Preserve log shows one redirect response followed by a second request that returns 200. Why are there two rows?
- [ ] duplicate-server | The server accidentally created the same resource twice.
- [x] follow-location | The client received a redirect and made another request to the new location.
- [ ] stateless-failure | Statelessness requires every GET to run twice.
- [ ] body-parsing | The first response omitted Content-Type, so the browser repeated it.
explanation: A redirect is a response telling the client to request another location. Preserve log keeps both exchanges visible.
hint: A redirect does not contain the final resource by magic; the client follows it with another request.
:::

<!-- lesson-step -->
<!-- step-id: mismatch-debugging-loop -->
# Turn every miss into a debugging explanation

Spend 40 minutes on cases you predicted incorrectly. Do not erase the original prediction. For each miss, write:

> **I expected X because ___. It was Y because ___.**

Use this loop:

1. **Observe:** copy the actual status, relevant response header, and minimal body evidence.
2. **Locate:** decide whether the mismatch concerns method semantics, request metadata, server implementation, redirect handling, or your command.
3. **Hypothesize:** write one cause that would explain the evidence.
4. **Test:** rerun the smallest changed request—perhaps add \`Content-Type\`, remove \`-L\`, or compare the request headers.
5. **Reconcile:** state whether your mental model was wrong, your command was wrong, or the service chose a different contract.

## Common traps

- **“I got a body, so it succeeded.”** Check the status first.
- **“The method guarantees the server implemented it correctly.”** Compare intended semantics with observed behavior.
- **“Idempotent means identical responses.”** Compare final server state, not response text.
- **“My body looks like JSON, so the server knows it is JSON.”** Inspect request \`Content-Type\`.
- **“curl printed only one response, so no redirect exists.”** Check whether you used \`-L\`, and inspect without it.
- **“The public fake API created or deleted durable data.”** Verify persistence rather than assuming it.

:::mcq
id: ai-login-contract-review
title: Review an AI-generated login endpoint
question: Generated server code returns 200 OK with {"success":false,"error":"invalid credentials"} when a login credential is invalid. What is the central contract problem?
- [ ] invalid-json | JSON cannot contain a boolean false.
- [x] misleading-success | The status reports success even though authentication failed; the endpoint should return an authentication failure status.
- [ ] needs-put | Login must always use \`PUT\` because it checks a password.
- [ ] needs-redirect | Every failed login must use a redirect.
explanation: Client logic should be able to trust the status. Invalid credentials fit \`401\`; returning \`200\` can route failure into success handling.
hint: Compare what the status claims with what the body admits.
:::

<!-- lesson-step -->
<!-- step-id: spoken-explanations -->
# Close the notes and explain the contracts

Use the final 20 minutes for retrieval. Stand up and answer each prompt without reading.

## 1. Idempotency

Explain why five identical \`POST /orders\` requests may create five orders, while five identical \`PUT /orders/42\` replacements leave order 42 in the same intended state as one. Add why repeated \`DELETE\` responses may differ even though the method is idempotent.

:::reveal Self-check: idempotency
A complete answer defines idempotency in terms of the intended effect on server state, applies that definition to creation versus replacement, and separates final state from response equality.
:::

## 2. Statelessness

Explain why a protected request must carry a credential or a session reference even if a login request happened immediately before it. Add the refinement that applications may still store sessions and business data.

:::reveal Self-check: statelessness
A complete answer says HTTP does not automatically link successive requests. The current request carries enough context—directly or by reference—for the server to identify and handle it. Application state may still exist elsewhere.
:::

## 3. \`401\` versus \`403\`

Say one sentence for each. Your \`401\` sentence must not contain the word *authorization*.

:::reveal Self-check: access failures
\`401\`: “I don't know who you are; provide valid credentials.”

\`403\`: “I know who you are; you are not allowed to perform this action.”
:::

<!-- lesson-step -->
<!-- step-id: http-semantics-finish-line -->
# Day 2 finish line

You are done when you can do all of this without notes:

- Given a duplicate signup email, answer **\`409 Conflict\`** immediately.
- Explain \`401\` and \`403\` in one sentence each without using *authorization* in the \`401\` sentence.
- Choose the intended method for read, create, replace, partial update, and delete operations.
- Explain why \`GET\` is safe, why \`POST\` creation is not idempotent, and why \`PUT\` replacement and \`DELETE\` are idempotent.
- Trace start line → headers → blank line → optional body in both a request and response.
- Distinguish \`Content-Type\` from \`Accept\` and explain what can happen when JSON is not labelled.
- Reproduce today's eleven-row status table from memory, including both redirect codes.
- Show nine prediction records containing both expected and observed evidence.
- Explain every mismatch with “I expected X because ___. It was Y because ___.”

Use this final map as a fast review, not as a replacement for the tables above. Follow the upper lane from the browser to the server: the request declares its method and carries context and data. Return along the lower lane: the response reports its status and carries its own context and result. Then use the three prompts beside the server to ask whether the method is safe, whether a repeated request is idempotent, and whether the current request carries the context that stateless HTTP requires. Finish along the evidence strip from **predict** to **inspect** to **explain**.

![A browser sends a request containing method, headers, and body to a server, which returns a response containing status, headers, and body; review asks whether the method is safe, whether repeats are idempotent, and whether the current request carries the context stateless HTTP requires before moving from prediction to inspection to explanation.](assets/lessons/day-002/http-contract-recap.png)

:::remember The durable review rule
Treat method, status, headers, and body as one contract. Predict what each part claims, inspect what the system actually did, and reject implementations whose claims disagree with their effects.
:::`;

export default defineMarkdownLesson({
  status:"published",
  title:"HTTP is a contract",
  summary:"Use methods, status codes, headers, message structure, and retry semantics to predict and diagnose API behavior.",
  outcome:"Choose HTTP contracts, explain idempotency and statelessness, distinguish 401 from 403, and verify predictions with network evidence.",
  mode:"Read → retrieve → predict → run → explain",
  mission:"Replace status-code guessing with a durable method-and-message model you can use to review every later API.",
  duration:"4 hours",
  level:"Complete beginner",
  reward:40,
  passingScore:80,
}, LESSON_MARKDOWN, { day:2 });
