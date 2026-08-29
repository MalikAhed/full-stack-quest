import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: grid-responsive-mission -->
# Grid: let tracks respond to available space

Yesterday, Flexbox arranged direct children along one main axis. Today you will replace the temporary project-card row with [[term: CSS Grid | A two-dimensional CSS layout model that places a container's direct children into rows and columns called tracks.]].

The durable model is:

> A grid container defines tracks. Grid items occupy cells made by those tracks. The browser sizes the tracks from your rules and the space actually available to the container.

By the end of today, you will be able to:

- choose Grid for a two-dimensional card layout and Flexbox for a one-dimensional content flow;
- predict how \`fr\`, \`repeat()\`, \`minmax()\`, and \`auto-fit\` size columns;
- type \`grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\` from memory;
- make one item span two columns only when enough columns exist;
- add mobile-first rules with \`@media (min-width: 48rem)\`;
- test the page at 360px, 768px, and 1280px; and
- find and fix the element that causes horizontal scrolling.

:::warning Zero-AI CSS day
Keep AI autocomplete off. Do not ask an assistant to generate, finish, repair, or check today's CSS. Type every layout declaration yourself. Use the written model, MDN, Grid Garden, DevTools, and your own predictions. This is the final day of the hand-writing tax; later you can delegate layout typing because you will be able to review it.
:::

## Your four-hour route

| Time | Activity |
| --- | --- |
| 0:00–0:15 | Watch one visual Grid explainer. Stop at fifteen minutes; look for tracks, cells, and available space rather than a property catalogue. |
| 0:15–0:55 | Use [Grid Garden](https://cssgridgarden.com/) as a drill. Stop at forty minutes even if levels remain. |
| 0:55–1:05 | Break. |
| 1:05–2:15 | Replace the Flexbox card row with a responsive Grid. |
| 2:15–3:15 | Test and repair the page at 360px, 768px, and 1280px. |
| 3:15–3:25 | Break. |
| 3:25–4:00 | Skim [MDN's CSS Grid guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout), explain Grid versus Flexbox aloud, then perform the blind memory test. |

The watch and game are capped drills. When either timer ends, move to the page: the build supplies the most useful evidence.

:::note Today's boundary
Master \`display: grid\`, \`grid-template-columns\`, \`gap\`, \`fr\`, \`repeat()\`, \`minmax()\`, \`auto-fit\`, \`grid-column: span 2\`, \`place-items: center\`, and one mobile-first \`min-width\` pattern. Do not expand today into a complete Grid reference.
:::

<!-- lesson-step -->
<!-- step-id: grid-container-items-tracks -->
# A parent creates tracks for its direct children

You already know the parent-child boundary from Flexbox. Grid keeps that boundary and changes the layout model.

\`display: grid\` turns an element into a **grid container**. Its direct children become **grid items**. Descendants deeper than one level are still laid out by their own parent unless that parent also becomes a layout container.

\`\`\`html title=project-relationship.html
<div class="project-grid">
  <article class="project-card">
    <h3>Weather Dashboard</h3>
    <p>Forecasts for saved cities.</p>
    <a href="https://github.com/example/weather">View repository</a>
  </article>
  <article class="project-card">...</article>
  <article class="project-card">...</article>
</div>
\`\`\`

\`\`\`css title=first-grid.css
.project-grid {
  display: grid;
}
\`\`\`

The three \`article\` elements are grid items. The heading, paragraph, and link inside the first article are not items of \`.project-grid\`; the article is their parent.

A [[term: grid track | One complete row or column in a grid.]] is not another HTML element. It is a sizing lane created by CSS. Where a row track and column track meet, they form a **cell**. Grid auto-placement puts unpositioned items into available cells in document order.

That is a useful first model. More precisely, Grid can place items across more than one cell and can create additional rows when content needs them. Today you only define columns and let the browser form the required rows; the deeper implicit-grid rules are deferred.

:::remember Debug the relationship first
If a Grid property appears to do nothing, inspect the item you expected to move. Find its direct parent, then verify that the parent—not the item—has \`display: grid\` and the track rule.
:::

:::mcq
id: grid-direct-child-check
title: Find the grid items
question: Only .project-grid has display: grid in the example. Which elements does it lay out directly?
- [ ] card-descendants | Every heading, paragraph, and link inside every article
- [x] project-articles | The three direct-child \`article\` elements
- [ ] grid-itself | The \`.project-grid\` element relative to the rest of the page
- [ ] all-sections | Every \`section\` anywhere in the document
explanation: A grid container lays out its direct children as grid items. Content inside each article belongs to a separate parent-child relationship.
hint: Look exactly one DOM level below the element with \`display: grid\`.
:::

<!-- step-id: grid-versus-flex-decision -->
# Choose by the relationship you need

Carry these two sentences:

> **Grid is for a two-dimensional layout you impose with rows and columns.**

> **Flexbox is for one-dimensional content that flows along a row or a column.**

The page can use both without conflict because each solves a different relationship:

| Page relationship | Better first tool | Why |
| --- | --- | --- |
| Name and navigation links in one line | Flexbox | The items form one row and may wrap as content requires. |
| Header, growing main, and footer | Flexbox | The three siblings share one vertical direction. |
| Project cards aligned in columns and rows | Grid | Column widths should coordinate across several rows. |
| One icon centered inside one square | Grid with \`place-items\` | One cell needs alignment on both dimensions. |

This is a choice rule, not a law that one tool can never imitate the other. Choose the model that describes the relationship with the least resistance.

:::mcq
id: grid-flex-transfer
title: Choose the layout model
question: A dashboard needs four cards in coordinated columns, and later rows must line up with those same columns. Which model best matches that relationship?
- [ ] flex-row | Flexbox, because every layout begins as a line
- [x] grid-tracks | Grid, because both rows and columns need a shared two-dimensional structure
- [ ] positioning | Absolute positioning, because every card needs coordinates
- [ ] inline-block | Inline-block, because cards are rectangular
explanation: Coordinated rows and columns are Grid's two-dimensional job. Flexbox remains appropriate for one-dimensional groups inside the cards.
hint: Ask whether you are describing one flow direction or both rows and columns.
:::

<!-- lesson-step -->
<!-- step-id: fractions-repetition-and-gaps -->
# Size columns as shares, not guesses

\`grid-template-columns\` defines the grid's column tracks. Start with three equal columns:

\`\`\`css title=three-column-grid.css
.project-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}
\`\`\`

The [[term: fr unit | A Grid flexible length representing a fraction of leftover space in the grid container.]] divides leftover track space into shares. Three \`1fr\` tracks receive equal shares.

The word **leftover** matters. The browser accounts for fixed-size tracks and gaps before distributing free space to flexible tracks. If the grid's content box is 932px wide and two gaps consume 16px each, the tracks share \`932 - 32 = 900px\`. Each \`1fr\` track receives 300px.

\`gap\` creates spacing **between** rows and columns. It does not add a gap outside the first or last track; container padding handles the outside edge.

## Remove repetition with \`repeat()\`

This rule has the same three-column meaning:

\`\`\`css title=repeat-three.css
.project-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
\`\`\`

Read \`repeat(3, 1fr)\` as: “repeat the track definition \`1fr\` three times.” The first argument is the repetition count; the second is the track definition.

Now change one number:

\`\`\`css title=unequal-shares.css
grid-template-columns: 1fr 2fr 1fr;
\`\`\`

After fixed space and gaps are accounted for, the tracks divide the flexible portion into four shares. The middle column gets two shares; each neighbor gets one.

:::reveal Predict before opening
Suppose the usable width after gaps is 800px. With \`1fr 2fr 1fr\`, the share total is 4. The columns receive 200px, 400px, and 200px. If the gap or a fixed track changes, recompute the leftover space before dividing it.
:::

:::fill-blanks
id: fixed-grid-recall
title: Rebuild a fixed three-column grid
question: Complete the parent rule with three equal tracks and spacing between them.
code:
\`\`\`css
.project-grid {
  display: [[layout]];
  grid-template-columns: repeat([[count]], [[share]]);
  gap: [[space]];
}
\`\`\`
answers:
- layout | grid
- count | 3
- share | 1fr
- space | 1rem
options:
- \`flex\`
- \`grid\`
- \`2\`
- \`3\`
- \`1fr\`
- \`250px\`
- \`1rem\`
explanation: The parent creates a grid, repeats one equal flexible track three times, and adds one spacing value between tracks.
hint: The repetition count is fixed here; the track itself takes one flexible share.
:::

<!-- step-id: responsive-grid-one-liner -->
# Make the number of columns respond

A fixed three-column grid is too wide on a narrow screen. You could keep adding breakpoints, but the component already knows the more useful input: **how much width is available to it right now?**

Use this line:

\`\`\`css title=responsive-project-grid.css highlight=3
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
\`\`\`

This one declaration handles most responsive card grids. Read every token:

| Token | Job | Prediction it supports |
| --- | --- | --- |
| \`grid-template-columns\` | Defines column tracks. | The declaration controls columns, not the card's internal content. |
| \`repeat(...)\` | Repeats one track pattern. | Several columns can share the same sizing rule. |
| \`auto-fit\` | Fits as many repeated tracks as can fit and collapses unused repeated tracks. | The occupied tracks can expand instead of preserving empty columns. |
| \`minmax(250px, 1fr)\` | Gives each track a 250px minimum and a flexible 1fr maximum. | Cards do not shrink below 250px while there is room; occupied columns share extra space. |
| \`gap: 1rem\` | Reserves spacing between tracks. | Gaps count when the browser decides how many columns fit. |

The working translation is:

> Create as many columns as fit. Keep each at least 250px wide. Then let the occupied columns share remaining space.

More precisely, \`auto-fit\` first behaves like an automatic repeat and then collapses empty repeated tracks after item placement. That refinement explains why two cards can expand across a wide container rather than leaving widths reserved for empty tracks. You do not need the \`auto-fill\` comparison today; use \`auto-fit\`.

## Predict before resizing

Assume \`1rem\` computes to 16px and ignore outer padding for this small exercise:

| Grid width | Fit test | Predicted columns |
| --- | --- | --- |
| 780px | \`3 × 250 + 2 × 16 = 782\` | Two; three miss by 2px. |
| 782px | \`3 × 250 + 2 × 16 = 782\` | Three fit exactly. |
| 530px | \`2 × 250 + 1 × 16 = 516\` | Two, with extra width shared. |
| 300px | One 250px minimum fits | One, with extra width available. |

These numbers describe the **grid container**, not necessarily the viewport. Parent padding, borders, and a width cap can make the container narrower than the browser window. Inspect the grid's computed width when a prediction and rendering disagree.

:::warning A minimum is a real constraint
If the grid's available width becomes less than 250px, the hard 250px minimum can overflow. Today's tested 300px viewport still has room when the page uses modest padding, but the general debugging rule is to compare the minimum track size with the container's actual content width.
:::

:::mcq
id: auto-fit-column-prediction
title: Predict the automatic track count
question: A grid is 530px wide, gap computes to 16px, and its columns use repeat(auto-fit, minmax(250px, 1fr)). How many 250px-minimum columns fit on one row?
- [ ] one-column | One, because \`auto-fit\` never creates a second track
- [x] two-columns | Two, because \`250 + 16 + 250 = 516px\`
- [ ] three-columns | Three, because each \`1fr\` can shrink below the minimum
- [ ] thirty-three | Thirty-three, because 530 divided by 16 is about 33
explanation: Two minimum tracks plus one gap need 516px, so they fit. Three minimum tracks plus two gaps would need 782px. The 1fr maximum shares extra space but does not cancel the 250px minimum.
hint: Add minimum track widths and only the gaps that sit between them.
:::

:::fill-blanks
id: responsive-grid-blind-recall
title: Type the responsive line from memory
question: Complete the exact card-grid declaration you must be able to type blind today.
code:
\`\`\`css
.project-grid {
  grid-template-columns: repeat([[fit]], minmax([[minimum]], [[share]]));
}
\`\`\`
answers:
- fit | auto-fit
- minimum | 250px
- share | 1fr
options:
- \`auto-fill\`
- \`auto-fit\`
- \`1fr\`
- \`250px\`
- \`100%\`
- \`3fr\`
explanation: \`auto-fit\` chooses the repetition count, \`250px\` protects the minimum track width, and \`1fr\` lets occupied tracks share remaining space.
hint: Say the working translation aloud: as many as fit, never below 250px, then share what remains.
:::

<!-- lesson-step -->
<!-- step-id: item-spans-and-centering -->
# Let one item cross tracks only when tracks exist

Grid container properties define the track system. A placement property such as \`grid-column\` goes on a **grid item**.

\`\`\`css title=feature-card.css
.project-card:first-child {
  grid-column: span 2;
}
\`\`\`

\`span 2\` means the item occupies two column tracks from its auto-placed starting position. It does not mean “twice as many pixels” independently of the grid; the item's width follows the two tracks plus the gap between them.

Do not apply this rule at the narrow base width. If only one explicit column fits, asking an item to span two columns can create another track and defeat the one-column design. Add it only when the viewport is wide enough for the intended layout:

\`\`\`css title=wide-feature-card.css
@media (min-width: 48rem) {
  .project-card:first-child {
    grid-column: span 2;
  }
}
\`\`\`

This breakpoint is not a magical device category. It is the point chosen for today's page because the content has enough room for the two-track feature card. Resize around it and verify the behavior.

:::mcq
id: span-overflow-diagnosis
title: Diagnose the wide card on mobile
question: At 360px, the grid should have one column, but the first card still tries to occupy two tracks and the layout becomes wider than expected. What is the most direct fix?
- [ ] shrink-text | Reduce every paragraph's font size
- [x] gate-span | Keep the base item at its automatic one-track span and apply \`grid-column: span 2\` inside a wide \`min-width\` media query
- [ ] fixed-position | Give the first card \`position: fixed\`
- [ ] hide-overflow | Hide all horizontal overflow without locating its cause
explanation: The special two-track placement belongs only where the intended tracks exist. Gate the span at a wide breakpoint; do not conceal the resulting overflow.
hint: The card's placement rule should match the number of available tracks.
:::

<!-- step-id: grid-place-items-center -->
## Center one item inside its cell

\`place-items\` is a shorthand that sets item alignment in both Grid axes. With one value, that value is used for \`align-items\` and \`justify-items\`:

\`\`\`html title=center-stage.html
<div class="center-stage">
  <span>Centered</span>
</div>
\`\`\`

\`\`\`css title=center-stage.css
.center-stage {
  display: grid;
  min-height: 12rem;
  place-items: center;
}
\`\`\`

The span is centered inside its grid area in both dimensions. \`place-items: center\` aligns **items inside their areas**; it is not the same as distributing the grid's tracks inside the whole container. Skip the larger alignment-property matrix today.

:::true-false
id: place-items-ownership
title: Place items on the parent
question: To center every grid item within its own grid area, place-items: center belongs on the grid container.
answer: true
explanation: \`place-items\` sets the default alignment of the container's grid items along both Grid axes. Individual-item exceptions use different properties that are outside today's scope.
hint: Ask which element owns the relationship among the grid items.
:::

<!-- lesson-step -->
<!-- step-id: mobile-first-additive-rules -->
# Start narrow, then add capability

[[term: mobile-first CSS | Base styles that work at narrow widths, with min-width media queries adding or changing rules when more space becomes available.]] keeps the fallback simple.

The browser always reads the base rule. It reads a \`min-width\` block too when the viewport is at least that wide.

\`\`\`css title=mobile-first-shape.css
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

@media (min-width: 48rem) {
  .project-card:first-child {
    grid-column: span 2;
  }
}
\`\`\`

At 360px, only the base rules apply. At 768px, which normally equals 48rem at the browser's default root size, the base rules still apply **and** the media-query rule becomes eligible. This is additive reasoning: the wider layout grows from the narrow layout instead of undoing a desktop layout.

For this exercise, use \`min-width\` queries only. \`max-width\` queries are valid CSS, but they encourage an override-first shape that this course is deliberately not practicing today.

:::true-false
id: media-query-additive-prediction
title: Predict the 48rem boundary
question: At a viewport wider than 48rem, the browser discards the base .project-grid rule and uses only declarations inside the media query.
answer: false
explanation: Matching media queries add eligible declarations to the cascade. Base rules remain present, and ordinary cascade rules decide conflicts.
hint: Mobile-first is additive: base first, wider changes on top.
:::

<!-- step-id: content-width-and-wide-columns -->
## Cap reading width without spending a media query

Use one existing wrapper around the page's main content, or add a neutral layout wrapper if needed:

\`\`\`css title=content-width-cap.css
.content-shell {
  max-width: 70rem;
  margin-inline: auto;
  padding-inline: 1rem;
}
\`\`\`

\`max-width: 70rem\` prevents content from stretching across an enormous monitor. \`margin-inline: auto\` shares remaining outside space and centers the capped block. The base \`padding-inline\` keeps content away from narrow viewport edges.

Do not put the width cap separately on every section. One shared shell gives the page a consistent measure.

## Guarantee three tracks at the wide check

With a 70rem cap, four 250px tracks can sometimes fit. Today's 1280px acceptance check requires exactly three columns, so use the second and final media query to express that wide-layout decision:

\`\`\`css title=wide-three-columns.css
@media (min-width: 75rem) {
  .project-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
\`\`\`

This is not a contradiction. The automatic rule handles the fluid range; the wide rule states a product decision: stop at three coordinated columns. You now have exactly two queries:

1. \`48rem\` enables the feature-card span.
2. \`75rem\` fixes the wide grid at three columns.

If the page looks wrong between those points, inspect the base styles before adding a third query.

:::mcq
id: responsive-rule-cascade
title: Trace the wide grid rule
question: At 1280px, both the base auto-fit declaration and the later min-width: 75rem declaration match .project-grid. Why does repeat(3, 1fr) control the columns?
- [ ] media-query-power | Media-query declarations always have greater specificity
- [x] source-order | The selectors have equal specificity, both rules apply, and the later declaration wins by source order
- [ ] base-removed | The browser deletes all base declarations after a media query matches
- [ ] important-rule | Every declaration inside \`@media\` behaves like \`!important\`
explanation: The media query controls eligibility, not specificity. Once eligible, the normal cascade applies; equal-specificity declarations are resolved by source order.
hint: Reuse Day 4: matching rules still compete through the cascade.
:::

<!-- step-id: deferred-grid-map -->
# Keep a map of what you are not learning

Stop the lesson from expanding:

- \`grid-template-areas\` provides an ASCII-like named-area syntax. It is useful, but optional; look it up when a page layout earns it.
- \`auto-fill\` is related to \`auto-fit\`. Use \`auto-fit\` today and compare them only when an under-filled grid looks wrong.
- Defer \`grid-auto-flow: dense\`, implicit-grid algorithms, and \`grid-auto-rows\` depth.
- [[term: subgrid | A Grid feature that lets a nested grid adopt tracks from its parent grid.]] is real and supported. Recognition is enough this year.
- Skip the \`justify-items\`, \`align-items\`, \`place-items\`, \`justify-content\`, and \`align-content\` matrix. Keep \`place-items: center\` and \`gap\`.
- Skip named grid lines.
- [[term: container query | A conditional CSS rule based on a containing element's size or features rather than the viewport.]] is the newer tool for component-level responsiveness. Know the name; do not practice it today.
- There is no universally correct set of breakpoints. Resize until the content looks wrong, then place a deliberate breakpoint. Today's \`48rem\` and \`75rem\` are course constraints, not natural constants.

Nothing on this map is forbidden forever. Each item has a retrieval condition: return when a real layout needs it.

<!-- lesson-step -->
<!-- step-id: replace-flex-row-build -->
# Build 1: replace the card row

**Time box: 70 minutes.** Work in the profile page from Days 3–5. Keep the Flexbox navigation and sticky-footer rules; only the project-card collection changes layout model.

## 1. Preserve the semantic cards

The six project \`article\` elements remain articles. Reuse the neutral wrapper created for Day 5 and rename its class from \`project-row\` to \`project-grid\`, or add that class to the existing wrapper.

\`\`\`html title=project-grid-shape.html
<section id="projects">
  <h2>Projects</h2>
  <div class="project-grid">
    <article class="project-card">...</article>
    <article class="project-card">...</article>
    <article class="project-card">...</article>
    <article class="project-card">...</article>
    <article class="project-card">...</article>
    <article class="project-card">...</article>
  </div>
</section>
\`\`\`

The wrapper is a legitimate \`div\`: it exists only to group self-contained articles for layout. Do not change the articles into generic elements to make Grid work.

## 2. Predict the change

Before editing CSS, write down:

1. Which element becomes the grid container?
2. Which elements become its grid items?
3. At the current width, how many 250px tracks plus gaps should fit?
4. Which Day 5 declarations must be removed so they do not compete with Grid?

Then delete the temporary card-row Flexbox rules, including child \`flex\` shares, and type this yourself from memory:

\`\`\`css title=project-grid-target.css
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
\`\`\`

Resize slowly. Watch the track count change rather than dragging directly from one endpoint to another. In DevTools, inspect the grid container and use the browser's Grid overlay if available. Confirm that the direct-child articles occupy tracks and that the gaps belong to the parent.

## 3. Add the two deliberate wide changes

Type both \`min-width\` rules yourself:

- At \`48rem\`, make only the first card span two columns.
- At \`75rem\`, set exactly three \`1fr\` columns.

Add the 70rem content cap to the shared content shell as a base rule. Count your media queries: the whole page may use **at most two** for today's responsive pass.

:::reveal Build evidence, not copy evidence
Your finished rule shape may match this, but compare it only after your own attempt:

\`\`\`css title=responsive-target-shape.css
.content-shell {
  max-width: 70rem;
  margin-inline: auto;
  padding-inline: 1rem;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

@media (min-width: 48rem) {
  .project-card:first-child {
    grid-column: span 2;
  }
}

@media (min-width: 75rem) {
  .project-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
\`\`\`

Class names may differ. Preserve the behavior and parent-child ownership rather than rewriting valid HTML to copy selectors.
:::

<!-- lesson-step -->
<!-- step-id: responsive-three-width-pass -->
# Build 2: prove three widths

**Time box: 60 minutes.** Open DevTools, enable its responsive device toolbar, and test exact viewport widths. Do not merely glance at approximate phone, tablet, and desktop presets.

| Width | Required evidence |
| --- | --- |
| **360px** | One card column. Navigation links wrap or stack. No element crosses the viewport. There is no horizontal scrollbar. |
| **768px** | Two card columns. The navigation fits on one line. The first card spans both columns because the 48rem rule is active at the default root size. |
| **1280px** | Exactly three card columns. The first spans two. The content is capped at 70rem and centered instead of stretching across the monitor. |

At each width, use the same loop:

1. **Predict** the column count and which media queries should match.
2. **Observe** the actual card layout and scrollbar.
3. **Inspect** the grid container's computed width and winning \`grid-template-columns\` declaration.
4. **Explain** any difference before changing code.
5. **Change one cause**, then retest all three widths.

:::note Root size and the 768px check

\`48rem\` commonly computes to 768px when the root font size is the browser default 16px. Users can change that size, which is one reason relative-unit breakpoints respond better to text scaling. For today's test, keep the default browser font size and record the media-query match in DevTools instead of assuming.
:::

## Do not solve the screenshot

Responsive design is not three unrelated screenshots. Drag slowly between the checkpoints. Text can wrap, cards can grow taller, and the automatic grid can change count between them. A correct layout preserves meaning, readable content, and no overflow throughout the range.

If 768px shows only one column, do not immediately add another media query. Inspect:

- the grid container's actual width after parent padding;
- whether \`display: grid\` and the track declaration both win the cascade;
- whether a card has a large fixed width or minimum width; and
- whether an old \`display: flex\` or child \`flex\` rule remains.

<!-- lesson-step -->
<!-- step-id: horizontal-scroll-hunt -->
# Hunt horizontal overflow from evidence

A horizontal scrollbar at 360px means some box is wider or positioned farther than the viewport. Hiding overflow would conceal the symptom, not fix the cause.

Use this debugging loop:

1. Confirm the scrollbar at exactly 360px.
2. In DevTools only, temporarily add this diagnostic rule:

\`\`\`css title=devtools-diagnostic-only.css
* {
  outline: 1px solid red;
}
\`\`\`

3. Scroll sideways and look for the box whose red outline crosses the viewport edge.
4. Inspect that element and its parent. Compare computed width, padding, margin, and Grid placement with the available width.
5. Form one cause-specific hypothesis.
6. Toggle or edit one declaration in DevTools.
7. Verify that the scrollbar disappears **and** the content still works.
8. Apply the fix in \`style.css\`, remove the diagnostic outline, then retest 360px, 768px, and 1280px.

Common causes on this page include:

- the feature card spans two tracks before the 48rem query;
- a card or image has a fixed width larger than its container;
- a long unbroken repository URL refuses to wrap;
- an element uses \`width: 100%\` plus padding under \`content-box\`; or
- a wide child is nested inside the grid item, even though the tracks themselves are correct.

:::mistake Do not blame Grid automatically
The scrollbar's responsible layer may be a descendant inside a correctly sized grid item. Find the first box that crosses the edge, then inspect outward and inward from that boundary.
:::

:::sequence
id: overflow-debug-order
title: Put the overflow investigation in order
question: Order the evidence-driven steps from first symptom to verified source fix.
- [5] source-fix | Apply the proven fix in the source, remove the outline, and retest every target width
- [2] outline | Add the temporary red outline in DevTools and locate the box crossing the edge
- [4] verify-toggle | Toggle one declaration and verify the scrollbar disappears without breaking content
- [1] reproduce | Reproduce the horizontal scrollbar at exactly 360px
- [3] inspect-hypothesize | Inspect the offending box and parent, then state one cause-specific hypothesis
explanation: Reproduce, locate, inspect and hypothesize, test one change, then commit the proven fix and run regression checks.
hint: Do not edit source until a small DevTools experiment supports the cause.
:::

<!-- lesson-step -->
<!-- step-id: grid-retrieval-and-transfer -->
# Close the tabs and retrieve

Use the final part of the MDN block with this lesson, Grid Garden, AI tools, and notes closed.

## Test 1: the line, blind

On paper or in a blank editor, type in under 30 seconds:

\`\`\`css
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
\`\`\`

Explain every token without reopening the lesson. If you look, clear the line and repeat before starting tomorrow's Git work.

## Test 2: shrink from 1200px to 300px

Explain aloud what happens as the grid container shrinks:

1. \`auto-fit\` permits fewer minimum-size tracks as the available width falls.
2. Gaps are included in the fit calculation.
3. Occupied tracks share leftover width through \`1fr\`.
4. Cards wrap into additional rows in document order.
5. By a 300px viewport with modest page padding, one 250px-minimum track remains.

Do not say only “it becomes responsive.” Name the cause of every observed change.

## Test 3: choose on a new component

A toolbar contains a label, search input, and two actions in one row: choose Flexbox and justify the one-dimensional flow. A gallery needs cards aligned across recurring rows and columns: choose Grid and justify the shared tracks.

## Test 4: diagnose a failed feature card

If the first card is wide at 1280px but causes overflow at 360px, name the responsible property, the correct rule boundary, and the DevTools evidence that would verify the repair.

:::reveal Retrieval standard
A strong explanation says: Grid defines coordinated rows and columns on a parent; Flexbox arranges a one-dimensional flow. In the responsive Grid line, \`auto-fit\` determines how many minimum-size tracks fit, \`minmax()\` protects 250px while allowing growth, and \`1fr\` shares leftover space. The two-column span belongs inside the 48rem \`min-width\` query, and the absence of a 360px scrollbar is verified in the browser rather than assumed from source.
:::

:::mcq
id: grid-transfer-finish-check
title: Transfer the responsive model
question: A card grid has plenty of viewport width but still shows one column. Which observation should you gather first?
- [ ] add-breakpoint | Add a new breakpoint immediately
- [ ] reduce-minimum | Change 250px to 100px before inspecting anything
- [x] actual-container | Inspect the grid container's actual computed width and the winning grid-template-columns declaration
- [ ] use-position | Replace Grid with absolute positioning
explanation: Track fitting uses the grid container's available width, not your guess from the viewport. Computed width and the winning declaration localize the cause before any fix.
hint: Measure the input Grid actually uses.
:::

<!-- lesson-step -->
<!-- step-id: grid-day-finish-line -->
# Day 6 finish line

You are done only when all of this evidence exists:

- You typed \`grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\` from memory.
- You can explain what happens as the viewport shrinks from 1200px to 300px, naming track minimums, gaps, automatic count, rows, and leftover-space sharing.
- Your project page has one column at 360px, two at 768px, and three at 1280px.
- The first card spans two columns only at wide widths.
- The navigation wraps or stacks at 360px and fits one line at 768px.
- Main content is capped at 70rem on the wide view.
- The stylesheet contains no more than two media queries, both using \`min-width\`.
- There is no horizontal scrollbar at 360px, and you verified that in the browser.
- You can say in one sentence when to choose Grid and when to choose Flexbox.
- You wrote today's CSS yourself with AI autocomplete disabled.

:::remember The model to carry forward
Grid's parent defines tracks; its direct children occupy them. Minimums decide what can fit, gaps consume space, and \`fr\` divides what remains. Start with the narrow fallback, add wider capability, and debug the container width the browser actually used.
:::

![A Grid parent defines auto-fit tracks with a 250px minimum and 1fr sharing; the same direct-child cards fit into three, two, or one track as container width changes, while a two-track span is reserved for wide layouts and DevTools verifies the actual container width and winning rule.](assets/lessons/day-006/css-grid-responsive-recap.png)

Read from the **Grid parent** into the three simultaneous width outcomes. Then use the bottom reminders as your debugging rule: apply \`span 2\` only where the intended tracks exist, and inspect the container's **actual width** plus the **winning rule** before changing CSS.

Tomorrow, preserve this finished page and use Git to turn the work into a sequence of meaningful snapshots, push it, and prove a fresh clone contains everything it needs.`;

export default defineMarkdownLesson({
  status:"published",
  title:"Grid: let tracks respond to available space",
  summary:"Build a responsive project-card grid from track sizing, mobile-first rules, and three-width browser evidence.",
  outcome:"Predict Grid track behavior, build the responsive card layout by hand, distinguish Grid from Flexbox, and diagnose horizontal overflow.",
  mode:"Watch → drill → build → test → retrieve",
  mission:"Replace the temporary Flexbox card row with a responsive Grid you can explain, test, and type from memory.",
  duration:"4 hours",
  level:"Complete beginner",
  reward:40,
  passingScore:80,
}, LESSON_MARKDOWN, { day:6 });
