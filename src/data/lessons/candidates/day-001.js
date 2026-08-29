import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: web-journey-map -->
# How the web actually works

You type an address, press Enter, and a page appears. That ordinary moment crosses several systems: your browser, the internet, a server, and then the browser again.

By the end of today, you will be able to:

- narrate **URL → pixels** in 90 seconds without notes;
- identify what the client, server, DNS, TCP, TLS, and HTTP each contribute;
- read a URL and state its origin;
- distinguish a static response from a dynamic one; and
- prove parts of the journey with the browser's Network panel.

:::note Today's boundary
You need the sequence and the responsibility of each part—not packet internals, certificate chains, or the browser's deep rendering algorithms. Those details matter later only when they change a decision you need to make.
:::

## Your three-hour route

- **0:00–0:40 — Watch:** use the single explainer below and pause to write the main sequence. Do not collect three competing explanations.
- **0:40–0:50 — Break.**
- **0:50–1:40 — Read:** use the guided MDN resources near the end of this lesson.
- **1:40–2:20 — Investigate:** inspect a real page with DevTools.
- **2:20–2:30 — Break.**
- **2:30–3:00 — Narrate:** write twelve sentences, then give your 90-second explanation standing up with no notes.

https://www.youtube.com/watch?v=AlkDbnbv7dk

While you watch, listen for three boundaries: **browser → network**, **network → server**, and **server response → browser rendering**. Do not worry if the video names internals that today deliberately defers.

<!-- lesson-step -->
<!-- step-id: client-server-conversation -->
# The web begins with two roles

The **internet** is the worldwide network that lets computers exchange data. The **web** is one system built on that network: browsers use web addresses and HTTP messages to retrieve resources.

A **browser** is an application such as Chrome, Firefox, Safari, or Edge. In a page load, it acts as a [[term: client | Software that initiates a request to another program and waits for its response.]].

A [[term: server | Software that listens for requests and sends responses; the word can also refer to the computer running that software.]] waits at the other side. It may return an HTML document, a stylesheet, JavaScript, an image, data, or an error.

The basic conversation is:

1. The **client** sends a [[term: request | A message asking a server to perform an action or return a resource.]].
2. The **server** does the necessary work.
3. The server sends a [[term: response | The server's reply, including a result status and usually data or content.]].

A **resource** is simply something identified on the web: an HTML document, CSS file, image, video, or piece of data. A page usually needs many resources, so loading one page normally creates many request–response exchanges.

:::remember Keep roles separate from machines
“Client” and “server” describe responsibilities in a particular exchange. Your laptop can run server software, and one server can act as a client when it requests data from another server.
:::

:::mcq
id: client-server-role-check
title: Follow the responsibility
question: A browser asks for an image, and a web server returns the image bytes. Which description is accurate?
- [ ] server-browser | The browser is the server because it displays the image.
- [x] client-browser | The browser is the client because it initiated the request; the web server sends the response.
- [ ] client-image | The image is the client because it travels across the internet.
- [ ] no-roles | Client and server apply only when a database is involved.
explanation: The browser initiated this exchange, so it is the client. Displaying the result is separate from the server's job of responding.
hint: Ask which software initiated the exchange and which software replied.
:::

<!-- step-id: url-anatomy -->
# A URL tells the browser what to reach

[[term: URL | Uniform Resource Locator: an address that identifies how and where to reach a resource.]] stands for **Uniform Resource Locator**. Read this example from left to right:

\`https://example.com:443/users/12?sort=asc#bio\`

| Part | Value | What it tells the browser |
| --- | --- | --- |
| Scheme | \`https\` | Which set of access rules to use. HTTPS means HTTP protected by TLS. |
| Hostname | \`example.com\` | The human-readable name of the server to contact. Developers often shorten this to “host” in conversation. |
| Port | \`443\` | Which network service on that host should receive the connection. \`443\` is the default for HTTPS. |
| Path | \`/users/12\` | Which resource or application route is being requested. It does not have to be a physical file. |
| Query string | \`?sort=asc\` | Extra input for the server, usually written as name–value pairs. |
| Fragment | \`#bio\` | A browser-side pointer to a place in the returned resource. The fragment is **not sent in the HTTP request**. |

Say the six names out loud: **scheme, hostname, port, path, query string, fragment**.

## The origin boundary

An [[term: origin | The combination of a URL's scheme, hostname, and port.]] is:

> **origin = scheme + hostname + port**

For ordinary HTTPS URLs, an omitted port still means the default port \`443\`. Therefore these have the same origin:

- \`https://example.com/users\`
- \`https://example.com:443/settings?tab=profile#name\`

The path, query string, and fragment differ, but origin ignores all three. Change the scheme, hostname, or port and the origin changes.

:::note Why learn origin on Day 1?
Browsers use origins as security boundaries. Later, Cross-Origin Resource Sharing (CORS) will decide whether browser code may read certain cross-origin responses. That later topic becomes much easier when this three-part definition is automatic.
:::

:::mcq
id: origin-boundary-check
title: Find the same origin
question: The current page is https://example.com:443/users/12. Which URL has the same origin?
- [ ] http-scheme | http://example.com:443/users/12
- [ ] other-host | https://api.example.com:443/users/12
- [x] other-path | https://example.com/settings?tab=profile#name
- [ ] other-port | https://example.com:8443/users/12
explanation: The matching URL uses the same HTTPS scheme, example.com hostname, and effective port 443. Path, query, and fragment do not affect origin.
hint: Compare exactly three pieces: scheme, hostname, and effective port.
:::

<!-- step-id: journey-first-pass -->
# First build the whole chain

Use this model for a **fresh HTTPS page load**. “Fresh” means we are temporarily ignoring shortcuts such as cached files and already-open connections so each responsibility is visible.

1. The browser interprets the URL.
2. DNS turns the hostname into an IP address.
3. The browser opens a reliable, ordered connection to that address.
4. TLS secures the connection and verifies the server's identity.
5. The browser sends an HTTP request.
6. The server handles the request and sends an HTTP response.
7. The browser parses the HTML and discovers other resources.
8. It requests needed CSS, JavaScript, images, and fonts.
9. It uses those resources to construct and paint the page.

:::reveal Check the handoff
The server does **not** paint the page on your screen. It sends resources and data. The browser interprets them, calculates what should appear, and produces the pixels.
:::

:::sequence
id: url-to-pixels-order
title: Reconstruct URL to pixels
question: Put the fresh HTTPS page-load stages in causal order.
- [8] parse-html | The browser parses the returned HTML
- [3] tcp | The browser establishes a reliable, ordered transport connection
- [11] paint | The browser calculates the page and paints pixels
- [6] server-work | The server selects or computes a result
- [1] read-url | The browser interprets the URL
- [9] discover | The browser discovers linked CSS, JavaScript, images, and fonts
- [4] tls | TLS secures the connection and verifies the server
- [7] response | The server sends an HTTP response
- [2] dns | DNS resolves the hostname to an IP address
- [10] fetch-more | The browser requests the additional resources it needs
- [5] request | The browser sends an HTTP request
explanation: URL → DNS → transport connection → TLS → request → server work → response → parse HTML → discover and fetch dependencies → paint.
hint: The browser must locate and connect to the server before it can send the request; it must receive HTML before it can discover the resources named inside it.
:::

<!-- step-id: connection-and-security -->
# What each network stage contributes

The chain is easier to remember when every link solves a distinct problem.

## 1. DNS answers “which network address?”

The [[term: DNS | Domain Name System: the system that resolves human-readable hostnames to network addresses.]] translates a hostname such as \`example.com\` into an **IP address**, a network address computers can route data toward.

DNS does not fetch the webpage. It helps the browser find an address it can contact. Large sites may resolve to different addresses depending on location and infrastructure, so do not memorize “one domain always equals one server.”

## 2. TCP answers “how do these bytes arrive reliably?”

**Transmission Control Protocol (TCP)** provides a reliable, ordered stream of data between two endpoints. For today, that one sentence is enough. You do not need the three-way handshake, packet recovery, or congestion-control algorithms.

## 3. TLS answers “can this conversation be trusted?”

**Transport Layer Security (TLS)** protects an HTTPS connection. It encrypts data in transit and gives the browser evidence that it is communicating with the server named by the certificate.

Encryption does not mean the website itself is honest or bug-free. It protects the connection and authenticates the server identity represented by the certificate.

## 4. HTTP answers “what is being asked and what happened?”

[[term: HTTP | Hypertext Transfer Protocol: rules for structuring requests and responses between web clients and servers.]] defines the messages exchanged after the connection is ready. A **protocol** is an agreed set of rules that lets two systems communicate predictably.

:::remember One job per layer
DNS locates. TCP transports reliably and in order. TLS secures and authenticates the connection. HTTP structures the request and response. Keeping those jobs separate helps you identify which layer failed.
:::

<!-- lesson-step -->
<!-- step-id: http-evidence -->
# Requests and responses leave evidence

Here is a simplified request for an HTML document:

\`\`\`http title=request.http
GET /users/12?sort=asc HTTP/1.1
Host: example.com
Accept: text/html
\`\`\`

- \`GET\` is the **method**: the kind of action requested.
- \`/users/12?sort=asc\` is the path and query being sent.
- \`Host\` and \`Accept\` are **request headers**: named metadata that add context.

The server might answer:

\`\`\`http title=response.http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!doctype html>
<html>...</html>
\`\`\`

- \`200 OK\` is the **status**: the result of handling the request.
- \`Content-Type\` is a **response header** describing the body format.
- The blank line separates headers from the **body**, the returned content.

Useful status families for today's investigation:

| Family | High-level meaning | Example |
| --- | --- | --- |
| \`2xx\` | The request succeeded. | \`200 OK\` |
| \`3xx\` | The client must use another location or a cached result. | \`301 Moved Permanently\` |
| \`4xx\` | The request cannot be fulfilled as sent. | \`404 Not Found\` |
| \`5xx\` | The server failed while handling the request. | \`500 Internal Server Error\` |

:::mcq
id: http-evidence-check
title: Read what the response proves
question: DevTools shows a completed request with status 404 and Content-Type application/json. What does that evidence support?
- [ ] dns-failed | DNS failed before the browser reached a server.
- [ ] success-html | The requested page succeeded and returned HTML.
- [x] missing-json | A server answered that the resource was not found, and described the response body as JSON.
- [ ] painted-page | The browser has already painted the final page.
explanation: A 404 response proves an HTTP response arrived. The status describes the missing resource, while Content-Type describes the body format.
hint: Separate the outcome from the format of the returned body.
:::

<!-- step-id: static-and-dynamic -->
# The server can return stored or computed content

The client–server conversation stays the same even when the server produces its answer differently.

## Static response: return existing content

A **static** resource is served substantially as stored. If the browser asks for \`/logo.svg\`, the server may read that existing file and send its bytes back.

## Dynamic response: compute an answer for this request

A **dynamic** response is produced by application logic when the request arrives. A profile page might depend on the signed-in user, current data, permissions, and the requested path. The server may read a [[term: database | An organized system for storing and retrieving application data.]], apply rules, and generate HTML or JSON.

| Request | Possible server work | Kind |
| --- | --- | --- |
| \`GET /logo.svg\` | Return the stored image file. | Static |
| \`GET /users/12\` | Look up user 12 and generate a response. | Dynamic |
| \`GET /dashboard\` | Check identity, query current data, and assemble a personalized page. | Dynamic |

“Dynamic” describes how the response is produced, not whether it moves on the screen. A JavaScript animation can live in a static file, while an unanimated account statement can be dynamically generated.

:::mcq
id: static-dynamic-check
title: Identify server-side computation
question: Which example most clearly requires a dynamic response?
- [ ] logo-file | Returning the same stored company logo to every visitor.
- [ ] css-file | Returning an existing stylesheet without changing it.
- [x] account-page | Checking the signed-in user and calculating that user's current account summary.
- [ ] icon-file | Returning a stored browser icon.
explanation: The account page depends on identity and current application data, so server-side logic must compute a result for the request.
hint: Look for an answer that depends on who asked or on current stored data.
:::

<!-- step-id: browser-builds-the-page -->
# An HTML response is not yet pixels

After the first HTML response arrives, the browser still has work to do:

1. It parses HTML into an in-memory document structure.
2. It discovers references to CSS, JavaScript, images, fonts, and other resources.
3. It sends more HTTP requests for resources it does not already have.
4. It parses CSS and applies style rules.
5. It runs JavaScript when the page requires it; JavaScript may change the document or request more data.
6. It calculates the size and position of visible elements.
7. It paints and combines the visual result into the pixels you see.

You need this high-level sequence, not the internals of reflow, repaint, or compositing layers.

:::warning Retire the misleading shortcut
“The server sends the website” is too vague for debugging. More precisely, the server sends responses containing resources or data; the browser uses them to construct the page. One page can involve dozens or hundreds of requests.
:::

<!-- lesson-step -->
<!-- step-id: useful-simplifications -->
# The interview chain is a model, not a recording

Real browsers optimize aggressively. The clean sequence can be shortened or altered when:

- DNS results or resources are already cached;
- a connection to the server is already open and can be reused;
- a server returns a redirect, causing another request;
- a service worker or browser cache supplies a response locally; or
- the browser uses HTTP/3, which uses QUIC rather than a new TCP connection.

These facts do not make the model useless. They tell you its boundary: it is the clearest conventional path for a fresh HTTPS load, not a promise that every navigation repeats every stage.

For awareness only:

- **HTTP/2** allows many request and response streams to share one connection.
- **HTTP/3** carries HTTP over QUIC instead of TCP.

Stop there today. Version internals, TLS certificate chains, TCP handshake details, packets, and the OSI seven-layer model do not improve today's target explanation.

:::tip A strong interview answer states its assumption
Begin with: “For a fresh HTTPS navigation, ignoring caches and connection reuse…” That short boundary makes the explanation both simple and technically honest.
:::

<!-- lesson-step -->
<!-- step-id: guided-reading -->
# Read with questions, not a highlighter

Spend about 50 minutes across these three MDN readings:

1. [What is a web server?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_web_server)
2. [How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works)
3. [What is a URL?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)

Answer these while reading:

- Which sentence most clearly separates client work from server work?
- What does DNS provide, and what does it **not** provide?
- What information is present in an HTTP request versus a response?
- Which URL parts change the origin?
- Which URL part never reaches the server?
- What makes a server response static or dynamic?

If a reading dives past today's boundary, note the term and keep moving. The goal is one connected model, not maximum notes.

<!-- lesson-step -->
<!-- step-id: devtools-archaeology -->
# Build: DevTools archaeology

The browser's [[term: DevTools | Developer tools built into a browser for inspecting pages, network activity, code, storage, and performance.]] Network panel makes invisible requests and responses visible.

Choose a public, non-sensitive website you use. Do not use banking, healthcare, company-admin, or private-account pages.

## Set up the evidence

1. Open the site.
2. Open DevTools: right-click the page and choose **Inspect**, or use the browser's developer-tools shortcut.
3. Select **Network**.
4. Turn on **Preserve log** so redirects remain visible.
5. Hard-refresh with \`Ctrl/Cmd + Shift + R\`.

Each row is one request–response exchange. The first document row is normally the navigation that returned the initial HTML; later rows often include CSS, JavaScript, images, fonts, and data requests.

## Record your findings in a text file

1. What was the **first document request**? Record its URL, method, status, and \`Content-Type\`.
2. How many requests completed in total? How many have a CSS type? How many are images?
3. Find a \`3xx\` response. Record its status and the \`Location\` response header that names the redirect target.
4. Open one request's **Headers** view. Record and label three request headers and three response headers.
5. Compare the first HTML request with one image or stylesheet request. What differs in URL, status, and \`Content-Type\`?

:::note If your page shows no 3xx row
That is valid evidence, not failure. With Preserve log enabled, navigate to \`http://github.com\`; it normally redirects to HTTPS. If browser policy upgrades it internally or the behavior later changes, record exactly what DevTools shows instead of inventing a redirect.
:::

:::security Protect secrets in screenshots
Before saving or sharing a screenshot, hide or crop cookies, \`Authorization\` headers, tokens, account identifiers, and private query values. These can grant access to accounts or expose personal data.
:::

## Investigate, do not merely collect

For each answer, point to the evidence that supports it. If the first request is not what you expected, check the **Type**, **Initiator**, redirect chain, and whether the log contains activity from before the refresh.

:::mcq
id: devtools-layer-check
title: Locate the failing layer
question: The Network panel shows an HTTP response with status 500 and Content-Type application/json. Which conclusion is justified?
- [ ] dns-only | DNS failed, so no server was reached.
- [ ] browser-only | The browser's paint stage is the only possible failure.
- [x] server-handling | A server received enough of the exchange to return HTTP, but failed while handling the request.
- [ ] success | Any received response means the request succeeded.
explanation: A 500 is an HTTP server-error response. The browser reached a server and received a reply, but server-side handling failed.
hint: Ask which earlier stages must have worked for an HTTP response to exist.
:::

:::response
id: twelve-sentence-narration
title: Write URL to pixels in twelve sentences
question: Write exactly twelve numbered sentences beginning with “You type https://example.com and press Enter.” Use one causal step per sentence and end with the browser painting the page. Then read it aloud without notes.
rubric:
- Identifies the browser as the client and interprets the URL
- Explains DNS resolving the hostname to an IP address
- Includes a reliable ordered connection and TLS protection for HTTPS
- Describes an HTTP request with a method, target, or headers
- Describes the server selecting a static resource or computing a dynamic result
- Describes an HTTP response with status, headers, and body
- Explains parsing HTML and requesting CSS, JavaScript, images, or fonts
- Ends with browser layout and painting, without hand-waving
field-label: Your twelve numbered sentences
placeholder: 1. You type https://example.com and press Enter.\n2. The browser...
max-length: 1800
guide: Use one main verb per sentence. If you write “and then it works,” replace it with the responsible system and its observable action.
:::

<!-- step-id: day-one-finish-line -->
# Your 90-second narration

Close your notes. Stand up and explain the journey using this spine:

> **URL → DNS → connection → TLS → HTTP request → server work → HTTP response → parse HTML → fetch dependencies → render → pixels**

Use the recap as one loop, not a collection of boxes. Start at **URL**, follow the upper route through DNS and the protected request to **Server work**, then trace the lower response route back through the page dependencies to **Pixels**. The stored/computed split reminds you that server work can return existing content or calculate a result; in either case, the browser constructs the visible page.

![A browser sends a DNS lookup and receives an IP address, sends an HTTP request over a TCP and TLS protected path to server work that uses stored or computed content, then receives an HTTP response and turns HTML, CSS, and JavaScript dependencies into pixels.](assets/lessons/day-001/fresh-https-navigation-recap.png)

You are done when you can:

- narrate that journey in 90 seconds without notes;
- define client, server, request, and response by their roles;
- name every part of \`https://example.com:443/users/12?sort=asc#bio\`;
- say, without pausing, “origin is scheme + hostname + port”;
- explain why the fragment is not part of the HTTP request;
- distinguish stored static content from a server-computed dynamic response; and
- use Network evidence to identify whether a failure reached the server.

:::remember The durable mental model
The page is not teleported from “the internet.” A client identifies a resource, locates and securely connects to a server, exchanges HTTP messages, and then the browser constructs the visible page from the responses.
:::`;

export default defineMarkdownLesson({
  status:"published",
  title:"How the web actually works",
  summary:"Trace a fresh HTTPS navigation from a URL through DNS, connection security, HTTP, server work, and browser rendering.",
  outcome:"Narrate URL to pixels in 90 seconds, define origin precisely, and verify the request–response chain in DevTools.",
  mode:"Watch → read → inspect → narrate",
  mission:"Replace the black-box idea of “the internet loads a page” with one evidence-based end-to-end model.",
  duration:"3 hours",
  level:"Complete beginner",
  reward:30,
  passingScore:80,
}, LESSON_MARKDOWN, { day:1 });
