import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: semantic-html-mission -->
# Build a page the browser can understand

Yesterday, an HTTP response carried HTML back to the browser. Today you will write that HTML so its **structure and controls communicate what they are**, even before any CSS or JavaScript exists.

That is the central model:

> HTML is not a drawing tool. It describes the meaning and structure of content; the browser turns that description into a document people and software can navigate.

By the end of today, you will be able to:

- choose semantic page elements instead of using a generic container for everything;
- preserve a clear heading hierarchy;
- choose an anchor for navigation and a button for an action;
- predict which form values are submitted and under which names;
- associate every form control with a visible label; and
- build and keyboard-test a zero-CSS profile-page skeleton.

:::note Today's boundary
You are learning to **read and review** HTML fluently. You do not need to memorize the full element catalog. The durable skill is recognizing whether the chosen element matches the content's job and verifying the result in a browser.
:::

## Your four-hour route

- **0:00–1:00 — Read:** skim [MDN's Structuring content module](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content), then read the semantics and document-structure pages carefully.
- **1:00–1:50 — Read:** use the first three articles in [MDN's Forms module](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms).
- **1:50–2:00 — Break.**
- **2:00–3:30 — Build:** create the profile-page skeleton in one file, \`index.html\`. No CSS and no JavaScript.
- **3:30–3:45 — Test:** unplug the mouse and perform the keyboard test.
- **3:45–4:00 — Explain:** justify every anchor and button out loud.

:::warning Hand-writing policy
Type today's project HTML yourself. Do not ask AI to generate or complete the skeleton. Every element you choose today buys the review skill you will use when AI writes markup later.
:::

<!-- lesson-step -->
<!-- step-id: document-shell-and-landmarks -->
# Start with a valid document and meaningful regions

A browser can display remarkably broken markup, but “it appears on screen” is a weak correctness test. Begin with a complete document shell:

\`\`\`html title=index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mira Chen | Developer Profile</title>
  </head>
  <body>
    <!-- Visible page content belongs here. -->
  </body>
</html>
\`\`\`

- \`<!doctype html>\` tells the browser to use modern HTML behavior.
- \`lang="en"\` identifies the document's language so speech and translation tools can handle it correctly. Replace \`en\` if your page is primarily another language.
- \`<head>\` contains document metadata; \`<body>\` contains the page people interact with.
- The character-set declaration supports normal text characters, and the viewport declaration lets later responsive CSS use the device width as expected.
- \`<title>\` names the browser tab and is not the visible page \`<h1>\`.

Inside \`<body>\`, use elements whose purpose matches each region:

| Element | Use it for | Profile-page example |
| --- | --- | --- |
| \`header\` | Introductory content for the page or a section | Site name and primary navigation |
| \`nav\` | A major group of navigation links | Links to About, Projects, and Contact |
| \`main\` | The page's dominant content | Hero, projects, and contact sections |
| \`section\` | A themed group that normally has a heading | The Projects region |
| \`article\` | A self-contained item that could stand on its own | One project card |
| \`aside\` | Related but secondary content | A short “currently learning” note, if genuinely tangential |
| \`footer\` | Closing information for the page or section | Author name and one external link |
| \`div\` | A container with no semantic meaning | A last resort when no meaningful element fits |

A \`section\` is not a prettier \`div\`. Use it when the grouped content has a theme you can name, normally with a heading. Use a \`div\` only when grouping is needed later for styling or scripting and no semantic element describes the group.

:::remember Landmark spine
For this page, think **header → main → footer**. Inside main, headings and sections describe the content hierarchy. Native landmarks give browsers and assistive technology a useful map without extra ARIA.
:::

:::mcq
id: choose-project-container
title: Choose the element by meaning
question: Each project has its own title, description, and repository link and could be reused independently in another project list. Which element best represents one project?
- [ ] section | \`<section>\`, because every visible box should be a section
- [x] article | \`<article>\`, because the project is a self-contained item
- [ ] nav | \`<nav>\`, because the project contains one link
- [ ] div | \`<div>\`, because semantic elements are only for screen readers
explanation: A project is a self-contained item, so \`article\` communicates its role. The repository link inside it does not turn the entire project into navigation.
hint: Ask whether the item could make sense on its own outside this particular list.
:::

<!-- step-id: headings-lists-links-images -->
# Give content an outline, not just a size

Headings create a hierarchy. Their number describes rank; it does not mean “large text.” For this project, use one clear \`<h1>\` for the page topic, \`<h2>\` for each major section, and \`<h3>\` for individual projects.

\`\`\`text title=profile-outline.txt
h1: Mira Chen — Full-Stack Developer
  h2: About
  h2: Projects
    h3: Weather Dashboard
    h3: Reading Tracker
    h3: Accessible Recipe Search
  h2: Contact
\`\`\`

This course uses two reliable rules:

1. Give the page one \`h1\` that names its main topic.
2. Do not skip a level merely to obtain a visual size: an \`h2\` subsection gets an \`h3\`, not an \`h4\`.

HTML can contain more complicated heading patterns, and the standard does not make “exactly one \`h1\`” a universal validity requirement. The course rule creates a predictable outline and prevents a common review failure. CSS will control size tomorrow; HTML controls rank today.

Use list markup when content is actually a list:

- \`ul\` for an unordered set such as navigation destinations;
- \`ol\` when sequence or rank matters; and
- one \`li\` for each item.

Use \`a\` with an \`href\` for a destination. A fragment link such as \`href="#projects"\` navigates to the element whose \`id\` is \`projects\`. The address gains the fragment, so this is real navigation even though it stays in the same document.

An \`img\` needs an \`alt\` decision:

| Image's job | Correct alternative text |
| --- | --- |
| It conveys useful content | Describe the useful information concisely, such as \`alt="Mira presenting the weather dashboard"\`. |
| It is decorative and adds no information | Use \`alt=""\` so it can be ignored by assistive technology. |
| It is a linked icon with no visible link text | Describe the link's purpose, not the pixels. |

Omitting \`alt\` is not the same as deliberately writing \`alt=""\`. Make the decision explicit for every image.

:::mcq
id: heading-rank-review
title: Review the page outline
question: The Projects section uses an h2. What heading should title each project article in this page hierarchy?
- [ ] h1 | \`h1\`, because every article must restart the page outline
- [ ] h2 | \`h2\`, because visual cards are all equally important
- [x] h3 | \`h3\`, because each project is a subsection of the h2 Projects section
- [ ] h4 | \`h4\`, because smaller text requires a larger heading number
explanation: Each project sits one level below the Projects \`h2\`, so \`h3\` expresses the hierarchy without skipping a rank. CSS, not heading rank, will control its visual size.
hint: Follow the content hierarchy one level down from the Projects heading.
:::

<!-- lesson-step -->
<!-- step-id: anchors-buttons-and-generic-clicks -->
# Anchors go somewhere; buttons make something happen

This distinction is one of the highest-value HTML review rules:

> **An anchor navigates to a destination. A button performs an action in the current interface.**

Use an anchor for:

- moving to \`#about\`, \`#projects\`, or \`#contact\`;
- opening a project repository; or
- moving to another page or route.

Use a button for:

- submitting a form;
- opening a menu or dialog;
- toggling a setting; or
- triggering another page action.

\`\`\`html title=destination-versus-action.html
<a href="#projects">View projects</a>

<button type="button">Show contact details</button>

<button type="submit">Send message</button>
\`\`\`

The first changes the URL's fragment and moves to a destination. The second would need JavaScript later to perform its action. The third activates its form's submission behavior.

Why not a \`div\` with a click handler? A real button already has button semantics, can receive keyboard focus, activates with the expected keyboard controls, participates in forms, supports the \`disabled\` state, and exposes a familiar interface to browser automation. Rebuilding those contracts around a generic \`div\` adds code and failure modes.

Inside a form, a \`button\` with no \`type\` defaults to submit behavior. Write the intent every time:

- \`type="submit"\` when it should submit;
- \`type="button"\` for an unrelated action inside the form.

That explicit choice prevents a future “Cancel” or “Show password” button from submitting a React form unexpectedly.

:::mcq
id: anchor-or-button-transfer
title: Choose the native contract
question: A “View repository” control opens https://github.com/example/weather. Which markup matches its job?
- [x] repository-anchor | An \`a\` element with that URL in \`href\`
- [ ] repository-button | A \`button type="button"\` whose click handler changes the URL
- [ ] clickable-div | A \`div\` with a click handler and button-like styles
- [ ] submit-button | A \`button type="submit"\`
explanation: Opening another URL is navigation, so an anchor with \`href\` provides the correct native contract. A button is for an action in the current interface.
hint: Ask whether activation goes to a destination or acts on the current page.
:::

<!-- lesson-step -->
<!-- step-id: form-submission-model -->
# A form turns controls into a request

A \`form\` groups controls that are submitted together. Day 2 gives you the network half of the model; HTML supplies the browser interface that creates the request.

For a normal form submission:

1. The user activates a submit button or another supported submit action.
2. The browser checks built-in constraints such as \`required\` and the basic format expected by \`type="email"\`.
3. If those checks pass, the browser constructs entries from eligible controls, using each control's \`name\` as the key and its current value as the value.
4. The form's \`method\` and \`action\` determine how and where the request is sent.
5. The browser follows the normal form navigation and displays the response.

With \`method="get"\`, submitted entries normally appear in the destination URL's query string. With \`method="post"\`, they normally go in the request body. A production contact form generally uses \`POST\` to a real server endpoint. Today you have no server, so you will temporarily use a same-page \`GET\` with fake data and inspect the query string.

:::warning Browser checks are not security

\`required\` and input types improve the browser experience, but a request can be created without your page. A real server must validate every incoming value. More validation attributes such as \`pattern\`, \`minlength\`, and \`step\` are deliberately deferred.
:::

## \`id\`, \`for\`, and \`name\` have different jobs

\`\`\`html title=contact-name-control.html
<label for="contact-name">Name</label>
<input id="contact-name" name="name" type="text" required>
\`\`\`

- The label's \`for="contact-name"\` matches the input's \`id="contact-name"\`. That association gives the control an accessible name and makes clicking the label focus the input.
- \`name="name"\` is the submission key. If the user types \`Mira\`, this control contributes an entry like \`name=Mira\`.
- The \`id\` identifies the element in the document; it does not decide the submitted key.

Trace two paths from the same Email input. Inside the document, \`for\` must match \`id\` to associate the visible label with its control. During submission, \`name\` becomes the key paired with the control's current value. Changing \`id\` without updating \`for\` breaks the label association; changing \`name\` changes the submitted key.

A control without a \`name\` can still appear and accept typing, but it does not contribute a named value to an ordinary form submission. A disabled control is not editable or normally focusable and is not submitted. An unchecked checkbox is also omitted from the submitted entries, so give the checked state an explicit value when it matters:

\`\`\`html title=subscribe-control.html
<input id="contact-subscribe" name="subscribe" type="checkbox" value="yes">
<label for="contact-subscribe">Subscribe to project updates</label>
\`\`\`

:::sequence
id: form-submission-order
title: Trace a native form submission
question: Put the browser's high-level form-submission stages in causal order.
- [4] send | Use the form action and method to send the entries
- [1] activate | Activate the submit control
- [5] navigate | Follow the form navigation and display the response
- [3] entries | Build name–value entries from eligible named controls
- [2] validate | Run applicable browser constraint checks
explanation: Activation starts submission; browser constraints run before the browser builds the eligible name–value entries, sends them according to action and method, and follows the form navigation to display the response.
hint: The browser should not construct and send a valid submission until the submit action begins and applicable constraints pass.
:::

<!-- step-id: form-control-toolbox -->
# Choose the control that matches the value

Input types communicate the kind of value expected. Browsers may present them differently across operating systems, but the meaning is stable.

| Control | Use it for | Important behavior today |
| --- | --- | --- |
| \`input type="text"\` | One line of general text | No special format check |
| \`input type="email"\` | An email address | Can receive email-oriented UI and basic format checking |
| \`input type="password"\` | A secret entered on one line | Visually masks the value; it does not encrypt the request |
| \`input type="number"\` | A numeric value | Provides numeric semantics and often stepper controls |
| \`input type="checkbox"\` | An independent on/off choice | Included only when checked |
| \`input type="radio"\` | One choice from a group | Radios with the same \`name\` form one group; label each option |
| \`input type="date"\` | A calendar date | Often provides a date picker |
| \`textarea\` | Multiple lines of text | Text between its tags is the initial value; the current value is submitted by \`name\` |
| \`select\` with \`option\` | One choice from a known list | The selected option's \`value\` is submitted under the select's \`name\` |

Attributes also carry distinct contracts:

- \`required\` blocks normal browser submission while the control has no acceptable value.
- \`placeholder\` is a temporary hint inside an empty control. It disappears during typing and is **not a label**.
- \`disabled\` makes a control unavailable and removes it from normal submission. Do not use it merely to make something look muted.

\`\`\`html title=subject-and-message.html
<label for="contact-subject">Subject</label>
<select id="contact-subject" name="subject">
  <option value="project">Project question</option>
  <option value="work">Work opportunity</option>
</select>

<label for="contact-message">Message</label>
<textarea id="contact-message" name="message" rows="6" required></textarea>
\`\`\`

:::mcq
id: submitted-control-name
title: Predict the submitted key
question: An input has id="contact-email", name="email", and the value "mira@example.com". Which key is used for its ordinary form-submission entry?
- [ ] contact-email | \`contact-email\`, because submission always uses \`id\`
- [x] email | \`email\`, because submission uses the control's \`name\`
- [ ] label-text | The visible label text, because labels name request fields
- [ ] type-email | \`type-email\`, because submission combines the element and input type
explanation: The label association uses \`for\` and \`id\`; the submitted key comes from \`name\`, producing an entry like \`email=mira%40example.com\` when URL-encoded.
hint: Separate the document identifier from the request-data key.
:::

<!-- lesson-step -->
<!-- step-id: accessible-by-default -->
# Accessibility begins with native behavior

[[term: accessibility | Designing and building so people with different abilities and assistive technologies can perceive, navigate, and operate the interface.]] is not a polish pass. It changes whether the interface works.

Today's high-value rules are concrete:

1. Use the native element whose behavior you need.
2. Give every form control a real visible \`label\` associated with \`for\` and \`id\`.
3. Give every meaningful image useful \`alt\`; use \`alt=""\` only when the image is decorative.
4. Make every enabled interactive element reachable in a logical order with \`Tab\`.
5. Preserve a visible focus indicator so the keyboard user can see where input will go.

Native anchors with \`href\`, buttons, and form controls already participate in keyboard navigation. Semantic elements also expose roles and relationships without you rebuilding them.

\`aria-label\` exists for the uncommon case where an interactive element has no usable visible text. It is not a shortcut around choosing the right element or writing a visible form label. If you are reaching for an ARIA role today, stop and check whether a native element already has that meaning.

Do not add positive \`tabindex\` values. They create a second manual navigation order that drifts away from the document. Today's page needs no \`tabindex\` at all.

:::accessibility Focus must be visible
Today there is no CSS, so keep the browser's native focus indicator. Later, styling \`:focus\` or \`:focus-visible\` may improve it, but removing an outline without a clear replacement ships a keyboard bug.
:::

:::mcq
id: keyboard-bug-review
title: Review a keyboard failure
question: A card built as a div responds to mouse clicks but cannot be reached with Tab. What is the best first review question?
- [x] native-element | Does this job actually belong to an anchor or button with native keyboard behavior?
- [ ] positive-tabindex | Which positive \`tabindex\` number should be added first?
- [ ] aria-role-first | Which ARIA role can preserve the div implementation unchanged?
- [ ] css-first | Which color will make the card look more clickable?
explanation: Fix the element choice first. Navigation belongs to an anchor and an interface action belongs to a button; both provide native focus and activation behavior without a manual tab order.
hint: Prefer the native contract before adding attributes to a generic element.
:::

<!-- lesson-step -->
<!-- step-id: labelled-form-practice -->
# Practice: wire a form's contracts

This focused exercise checks only facts the editor can prove statically. Complete it before building the larger page.

:::code-question
id: labelled-contact-form
title: Complete the labelled contact form
instructions:
Add the missing attributes so every selector described below exists. Keep the visible labels and controls in their current order. Run the checks when all six contracts are explicit.
requirements:
- Put a label for contact-name immediately before a required text input whose id is contact-name and whose submitted name is name.
- Put a label for contact-email immediately before a required email input whose id is contact-email and whose submitted name is email.
- Put a label for contact-subject immediately before a select with id contact-subject, submitted name subject, and at least two options.
- Put a label for contact-message immediately before a required textarea whose id is contact-message and whose submitted name is message.
- Put a subscribe checkbox with id contact-subscribe and submitted name subscribe immediately before its matching label.
- Use an explicit submit button.
html:
\`\`\`html
<form action="/contact" method="post">
  <label>Name</label>
  <input>

  <label>Email</label>
  <input>

  <label>Subject</label>
  <select>
    <option value="project">Project question</option>
    <option value="work">Work opportunity</option>
  </select>

  <label>Message</label>
  <textarea rows="6"></textarea>

  <input value="yes">
  <label>Subscribe to project updates</label>

  <button>Send message</button>
</form>
\`\`\`
checks:
- html-selector | label[for="contact-name"] + input#contact-name[name="name"][type="text"][required]
- html-selector | label[for="contact-email"] + input#contact-email[name="email"][type="email"][required]
- html-selector | label[for="contact-subject"] + select#contact-subject[name="subject"] > option:nth-of-type(2)
- html-selector | label[for="contact-message"] + textarea#contact-message[name="message"][required]
- html-selector | input#contact-subscribe[name="subscribe"][type="checkbox"] + label[for="contact-subscribe"]
- html-selector | button[type="submit"]
:::

<!-- step-id: build-profile-skeleton -->
# Build: the zero-CSS profile skeleton

Create \`index.html\` and nothing else. It should look like an early web document. That is correct. Do not create a stylesheet, add a \`style\` attribute, or use JavaScript.

## Required structure

Read the document from the outside in, then from top to bottom. The \`body\` contains sibling \`header\`, \`main\`, and \`footer\` regions. The header owns the navigation, while main owns the content sections. Within main, Projects owns the repeated \`article\` elements and Contact owns the \`form\`. The heading outline follows the same nesting: one page \`h1\`, section \`h2\` headings, and project \`h3\` headings.

Draw or copy this compact text tree on paper as your build checklist:

\`\`\`text title=profile-structure.txt
body
├── header
│   └── nav
├── main
│   ├── section: hero
│   ├── section: about (if linked)
│   ├── section: projects
│   │   └── article × 6
│   └── section: contact
│       └── form
└── footer
\`\`\`

Build this document from top to bottom:

1. A \`header\` containing a \`nav\`.
   - Put your name or text logo in the header.
   - Use a \`ul\` containing three or four fragment-link anchors such as \`#about\`, \`#projects\`, and \`#contact\`.
2. One \`main\` containing:
   - a hero \`section\` with one page \`h1\` and a short paragraph;
   - an About section if your navigation links to \`#about\`;
   - a Projects \`section id="projects"\` with an \`h2\` and **six** project \`article\` elements;
   - in every article, an \`h3\`, a paragraph, and an anchor to a repository destination; and
   - a Contact \`section id="contact"\` with an \`h2\` and the form described below.
3. A \`footer\` containing your name and one anchor.

Every fragment destination must exist as a matching \`id\`. A link to \`#projects\` and an element with \`id="project"\` do not match.

## Required contact form

Include:

- name: \`type="text"\`;
- email: \`type="email"\`;
- subject: \`select\` with at least two \`option\` elements;
- message: \`textarea\`;
- subscription choice: \`type="checkbox"\` with an explicit value; and
- \`button type="submit"\`.

Every control needs a visible label with matching \`for\` and \`id\`, plus a \`name\` that describes the submitted field. Make name, email, and message \`required\`. A placeholder may add an example, but it never replaces the label.

For today's local submission experiment, use fake values and set the form to \`action="" method="get"\`. After submission, inspect the URL query string and identify each \`name=value\` pair. Notice whether \`subscribe=yes\` appears when the checkbox is unchecked versus checked. Before publishing a real contact form, connect it to a server endpoint and use the method that matches that endpoint's contract; do not put private messages into a public URL.

## Review rules before opening the browser

- Exactly one \`h1\` for this page; headings descend without skipped levels.
- No \`div\` unless you can explain why no semantic element fits.
- Every anchor has a real \`href\` destination.
- Every button declares its \`type\`.
- Every input, select, and textarea has a visible associated label and a useful \`name\`.
- Every image has meaningful \`alt\`, or \`alt=""\` when truly decorative. Images are optional today.
- No CSS, JavaScript, ARIA roles, or positive \`tabindex\`.

:::tip Use the browser as evidence
Open the file after each major region. If the document outline is wrong, fix the markup. Do not reach for CSS to disguise a structural mistake.
:::

<!-- lesson-step -->
<!-- step-id: keyboard-and-submission-test -->
# Unplug the mouse and test the contract

Move the mouse out of reach. Reload the page and start at the top.

1. Press \`Tab\` repeatedly.
2. Confirm every navigation link, repository link, enabled form control, footer link, and submit button receives focus.
3. At every stop, point to the visible focus indicator. If you cannot tell where focus is, that is a bug.
4. Activate each anchor with \`Enter\`. Confirm the URL and destination match your prediction.
5. Focus each associated label by clicking only during a separate mouse check; clicking the label should focus or toggle its control.
6. With the keyboard again, focus the checkbox and press \`Space\`; confirm its checked state changes.
7. Try to submit with required fields empty. Explain why the browser blocks the submission.
8. Enter **fake** valid values, move to the submit button, and press \`Enter\`.
9. Read the resulting query string. Match every submitted key to a \`name\` in your HTML. Repeat once with the checkbox checked and once unchecked.

Do not expect disabled controls in this test: the build does not need any. If you add one while experimenting, predict that it will be skipped by normal keyboard focus and omitted from submission, then verify it.

:::mcq
id: checkbox-query-prediction
title: Predict the submitted entries
question: A GET form has a checked checkbox with name="subscribe" and value="yes", plus an unchecked checkbox with name="beta" and value="yes". Which entry behavior should you predict?
- [ ] both | Both \`subscribe=yes\` and \`beta=yes\` are submitted because both controls have names.
- [x] checked-only | \`subscribe=yes\` is submitted; the unchecked beta checkbox contributes no entry.
- [ ] unchecked-only | Only \`beta=yes\` is submitted because unchecked means false.
- [ ] neither | Checkboxes are never included in form submission.
explanation: A checked checkbox contributes its name and value. An unchecked checkbox is omitted; native form submission does not automatically add \`beta=false\`.
hint: A checkbox contributes an entry only in its checked state.
:::

<!-- lesson-step -->
<!-- step-id: deferred-html-surface -->
# Know what you are deliberately leaving out

The HTML platform is much larger than today's job. Keep these retrieval hooks, then move on:

- **ARIA:** know that \`aria-label\` exists, but prefer native elements and visible labels. Do not study roles today.
- **Less-common semantic elements:** \`dl\`/\`dt\`/\`dd\`, \`figure\`/\`figcaption\`, \`time\`, \`mark\`, and \`details\` are real; look them up when a design needs their meaning.
- **Metadata for marketing and discovery:** microdata, Schema.org, and Open Graph tags are outside today's engineering task.
- **Web Components:** \`template\`, \`slot\`, and Shadow DOM belong to the Web Components model; awareness of the phrase is enough.
- **Extra browser-validation attributes:** \`pattern\`, \`minlength\`, and \`step\` can improve the interface, but server validation remains mandatory and comes later.
- **Special media and drawing surfaces:** authoring \`canvas\`, SVG, and video is not part of this stack today.
- **Positive \`tabindex\`:** never use it. Native document order is today's complete rule.

The boundary is deliberate: none of these topics improves your ability to choose the correct elements and ship today's keyboard-operable skeleton.

<!-- lesson-step -->
<!-- step-id: semantic-html-finish-line -->
# Explain the page you built

Close the editor and answer aloud:

1. Why are the navigation items anchors while the Send message control is a button?
2. Why is a button better than a clickable \`div\`? Give two reasons, including one that is not merely “accessibility.”
3. In \`<label for="email">\` and \`<input id="email" name="contactEmail">\`, what does each of \`for\`, \`id\`, and \`name\` do?
4. What changes in the submitted query when the subscription checkbox is unchecked?
5. Why is a placeholder not a label, and why does browser validation not replace server validation?

:::reveal Self-check
1. Anchors navigate to URL destinations; the submit button activates the form's submission action.
2. A native button provides keyboard and semantic behavior **and** participates in forms, supports explicit button types and disabled state, and reduces custom code and testing.
3. \`for\` points to the control whose matching \`id\` identifies it in the document; \`name\` becomes the submitted data key.
4. The unchecked checkbox contributes no entry, so its \`name=value\` pair disappears.
5. A placeholder vanishes during typing and does not create a persistent label. Browser checks can be bypassed, so the server must validate untrusted requests.
:::

Use this diagram as a final scan, not as a substitute for the code you wrote. Start with the semantic page in the center, then move clockwise: structure gives the document its hierarchy; native links and buttons provide the right behavior; form attributes connect labels and submitted keys; and keyboard focus plus the query string provide observable proof. The plain branch lines show that all four contracts belong to the same document, while arrows show actual navigation, action, focus movement, or submitted-data flow.

![A semantic HTML page connects to four recap branches: sibling header, main, and footer regions with an h1-to-h2-to-h3 hierarchy; links leading to destinations and buttons triggering actions; label for matching control id and name flowing into a request; and Tab focus plus submission query data providing browser evidence.](assets/lessons/day-003/semantic-html-contracts-recap.webp)

You are done when you can navigate the entire page and submit fake form data with the keyboard alone, every focus stop is visible, the URL proves which named controls were submitted, and you can say this sentence without notes:

> **The nav items are anchors because they navigate to destinations; Send is a submit button because it performs the form's submission action.**

:::remember The durable review rule
Choose elements by behavior and meaning, then verify their native contracts with the keyboard and the submitted request—not by how they look.
:::`;

export default defineMarkdownLesson({
  status:"published",
  title:"Semantic HTML, forms, and accessibility",
  summary:"Choose meaningful elements, trace native form submission, and build a labelled profile page that works from the keyboard before CSS exists.",
  outcome:"Build and review a semantic one-file profile skeleton, predict submitted form data, and justify anchors, buttons, labels, and heading levels.",
  mode:"Read → predict → build → keyboard-test → explain",
  mission:"Turn HTML from visual boxes into a meaningful, testable document whose native browser behavior you can trust and review.",
  duration:"4 hours",
  level:"Complete beginner",
  reward:40,
  passingScore:80,
}, LESSON_MARKDOWN, { day:3 });
