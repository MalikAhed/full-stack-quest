import { defineMarkdownLesson } from "../../../markdown/lesson-model.js";

export const LESSON_MARKDOWN = `<!-- step-id: css-evidence-mission -->
# Make CSS explain itself

Yesterday you built a semantic profile page in \`index.html\`. It was intentionally unstyled. Today you will add \`style.css\`, but the durable skill is not memorizing a catalog of properties. It is proving **why the browser chose the result you see**.

Use this debugging loop all day:

1. **Observe** the element and the unexpected property.
2. **Inspect** the matching declarations in DevTools.
3. **Predict** which declaration should win and what value should be computed.
4. **Test** one change in DevTools.
5. **Verify** the computed value and the page reflow.
6. **Edit the source file** only after the evidence supports your explanation.

By the end of today, you will be able to:

- calculate what \`width\` means under \`content-box\` and \`border-box\`;
- predict ordinary cascade results from origin, specificity, and source order;
- distinguish an inherited value from one declared on the selected element;
- use custom properties for the page's color system; and
- locate the exact winning CSS declaration in DevTools in under twenty seconds.

## Your four-hour route

| Time | Activity |
| --- | --- |
| 0:00–1:15 | Read the assigned MDN pages on the box model, cascade and specificity, and values and units. Use this lesson as your question guide. |
| 1:15–1:25 | Break. |
| 1:25–2:25 | Build the base stylesheet for yesterday's page. |
| 2:25–3:10 | Run the specificity duel and verify every prediction in DevTools. |
| 3:10–3:20 | Break. |
| 3:20–4:00 | Perform DevTools archaeology on a site you did not write. |

[Open MDN's CSS styling basics module](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics). Read the box model, cascade and specificity, and values and units pages properly; skim neighboring pages only for orientation.

:::note Today's boundary
Do not use Flexbox, Grid, or positioning in the base stylesheet. Also defer specificity number tuples, \`!important\`, float layouts and clearfix, stacking contexts and \`z-index\`, \`em\` compounding, extra units such as \`ch\` and \`vmin\`, \`calc()\` tricks, reset debates, preprocessors, and Tailwind. A float can still wrap text around an image, but that is not today's layout tool.
:::

<!-- lesson-step -->
<!-- step-id: every-element-has-boxes -->
# Every rendered element participates through boxes

The browser lays out an element using nested rectangular areas:

> **content → padding → border → margin**

- **Content** is the text, image, or descendants inside the element.
- **Padding** is space inside the border.
- **Border** surrounds the padding and content.
- **Margin** is transparent space outside the border.

When you declare \`width: 200px\`, which of those areas must fit inside the 200 pixels? The [[term: box-sizing | The CSS property that decides whether a declared width and height size the content box or the border box.]] property answers that question.

With the initial value, \`content-box\`, a declared width sizes only the content. Horizontal padding and borders are added outside it:

\`outer width = content width + left/right padding + left/right border\`

With \`border-box\`, the declared width includes content, padding, and border. Margin is outside either model.

\`content width = declared border-box width - left/right padding - left/right border\`

Consider this box:

\`width: 200px; padding: 16px; border: 2px solid;\`

:::reveal Predict before opening
Under \`content-box\`, its border box is \`200 + 16 + 16 + 2 + 2 = 236px\` wide. Under \`border-box\`, its border box stays \`200px\` wide and the content width becomes \`164px\`. Margin would still sit outside that 200-pixel border box.
:::

:::mcq
id: border-box-width-prediction
title: Predict the visible box width
question: A box has width: 300px, padding: 20px, border: 5px solid, and box-sizing: border-box. Ignore margin. How wide is its border box?
- [ ] content-total | \`350px\`, because padding and border are always added outside width
- [x] declared-total | \`300px\`, because width already includes content, padding, and border
- [ ] content-only | \`250px\`, because the content width is the visible width
- [ ] padding-only | \`340px\`, because only padding is added outside width
explanation: With \`border-box\`, the declared 300px is the border-box width. The content area shrinks to make room for 40px of padding and 10px of border.
hint: Ask which box the declared width sizes; margin is not part of either answer.
:::

<!-- step-id: global-border-box-rule -->
# Set the sizing contract once

Start \`style.css\` with this rule:

\`\`\`css title=style.css
*,
*::before,
*::after {
  box-sizing: border-box;
}
\`\`\`

The universal selector \`*\` matches elements. The other two selectors include generated \`::before\` and \`::after\` boxes if you use them later. From this point, a declared width describes the border box throughout your page.

Then add the two other reset-sized rules you need today:

\`\`\`css title=style.css
body {
  margin: 0;
}

img {
  display: block;
  max-width: 100%;
}
\`\`\`

Browsers ship with a default body margin. Resetting it removes that outer gap. A block image does not sit on a text baseline, and \`max-width: 100%\` prevents a large image from exceeding the available width while still allowing a smaller image to remain smaller.

:::remember What the reset does not do
It does not make every element the same size, remove all browser styles, or create a layout. It establishes three predictable defaults and then gets out of your way.
:::

:::fill-blanks
id: three-rule-reset
title: Rebuild the small reset
question: Fill the values that establish today's predictable sizing and image behavior.
code:
\`\`\`css
*, *::before, *::after { box-sizing: [[sizing]]; }
body { margin: [[body-margin]]; }
img { display: [[image-display]]; max-width: [[image-width]]; }
\`\`\`
answers:
- sizing | border-box
- body-margin | 0
- image-display | block
- image-width | 100%
options:
- \`content-box\`
- \`inline\`
- \`border-box\`
- \`100vw\`
- \`0\`
- \`block\`
- \`100%\`
explanation: \`border-box\` keeps declared sizes predictable, zero removes the default body margin, and a block image capped at \`100%\` avoids baseline space and oversizing.
hint: Width should describe the border box, and the image should be block-level without exceeding its available width.
:::

<!-- step-id: normal-flow-and-display -->
# Display changes how a box joins normal flow

[[term: normal flow | The browser's default placement of boxes before Flexbox, Grid, floats, or positioning changes that placement.]] is the baseline you should understand before changing layout.

| Value | Working model for today | Consequence to predict |
| --- | --- | --- |
| \`display: block\` | Starts on a new line and normally expands across the available inline space. | The next block appears below it. |
| \`display: inline\` | Participates in a line of text. | It flows beside neighboring text; ordinary width and height do not size it like a block. |
| \`display: inline-block\` | Sits in a text line on the outside but accepts block-like width and height. | Several boxes can share a line and still be sized. |
| \`display: none\` | Generates no display box. | It occupies no layout space, and its descendants are hidden too. |

HTML meaning and CSS display are different responsibilities. A semantic \`<a>\` can be displayed as a block, but it is still a link. Do not change an element's meaning merely to obtain a convenient default box.

:::accessibility Hiding is a behavior decision
\`display: none\` removes content from visual layout and, in normal use, from the accessibility tree. Do not use it when people using assistive technology still need the content.
:::

:::mcq
id: display-model-transfer
title: Choose the box behavior
question: Three short navigation links should remain links, sit on one text line when space permits, and accept explicit padding and dimensions. Which display value best matches that box behavior today?
- [ ] block | \`block\`
- [ ] inline | \`inline\`
- [x] inline-block | \`inline-block\`
- [ ] none | \`none\`
explanation: \`inline-block\` participates inline while retaining block-like sizing. CSS does not change the links' HTML meaning.
hint: Combine “shares a line” with “accepts box dimensions.”
:::

<!-- lesson-step -->
<!-- step-id: spacing-units-and-margin-collapse -->
# Choose units by what should control the size

A CSS [[term: unit | The measurement attached to a numeric CSS value, such as px, rem, percent, vh, or vw.]] expresses what a size should respond to.

| Unit | Relative to | Use today |
| --- | --- | --- |
| \`px\` | A CSS reference pixel | Thin borders and small shadows. |
| \`rem\` | The root element's font size | Type and spacing that should follow a user's font-size preference. |
| \`%\` | The relevant size of a containing block, depending on the property | Widths that should follow their container. |
| \`vh\` | One percent of the viewport height | Full-viewport-height sections when that behavior is actually required. |
| \`vw\` | One percent of the viewport width | Full-viewport-width effects; use carefully because overflow can result. |

Default to \`rem\` for type and ordinary spacing. Keep \`px\` for details that should remain thin. Use \`%\` when the container is the relationship you mean. The unit communicates intent; there is no universally correct unit for every property.

## The margin surprise

Adjoining vertical margins between block boxes in normal flow can [[term: margin collapse | The rule by which certain vertical block margins combine instead of adding together.]]. Two sibling paragraphs with \`margin-bottom: 1rem\` and \`margin-top: 2rem\` will commonly have a \`2rem\` gap, not \`3rem\`.

You do not need the complete collapse algorithm today. When a vertical gap is smaller than your arithmetic predicts, inspect both boxes' margins before adding another rule.

:::mcq
id: collapsed-margin-prediction
title: Predict the sibling gap
question: In ordinary block flow, one section has margin-bottom: 1rem and the next has margin-top: 2rem. If those margins adjoin and collapse, what gap should you expect?
- [ ] sum | \`3rem\`
- [ ] first | \`1rem\`
- [x] larger | \`2rem\`
- [ ] none | \`0\`
explanation: Adjoining positive vertical margins collapse to the larger margin rather than adding together.
hint: “Collapse” means these two positive margins combine, not sum.
:::

<!-- step-id: position-reference-frames -->
# Position chooses a reference frame

The \`position\` property answers two questions: does this box remain in normal flow, and what reference controls any offsets such as \`top\` or \`left\`?

| Value | Normal-flow behavior | Working reference |
| --- | --- | --- |
| \`static\` | Remains in normal flow. This is the initial value. | Offset properties do not move it. |
| \`relative\` | Keeps its original space in normal flow. | Offsets move it from its normal position; it can establish a reference for positioned descendants. |
| \`absolute\` | Is removed from normal flow. | Usually the nearest positioned ancestor; otherwise the initial containing block. |
| \`fixed\` | Is removed from normal flow. | Usually the viewport, so it stays in place while the document scrolls. |
| \`sticky\` | Participates in normal flow, then is constrained during scrolling. | Its nearest relevant scrolling area; it needs an inset such as \`top: 0\` to define the sticking threshold. |

For ordinary pages without transforms or containment, this shortcut works:

> An absolutely positioned box uses the nearest ancestor whose \`position\` is not \`static\`.

More precisely, it uses the nearest ancestor that establishes its **containing block**. Properties such as transforms can also establish that reference. That refinement becomes useful when the shortcut and DevTools evidence disagree; you do not need those mechanisms today.

:::warning Reading knowledge, not today's layout tool
Be able to identify these five values in unfamiliar CSS. Do not use any of them to force the Day 3 page into place. Flexbox and Grid will supply the layout model on Days 5 and 6.
:::

<!-- lesson-step -->
<!-- step-id: inheritance-and-color-tokens -->
# Some values travel down the document tree

CSS [[term: inheritance | The process by which an element receives the computed value of an inheritable property from its parent when it has no winning declaration of its own.]] reduces repetition.

Set \`color\` and \`font-family\` on \`body\`, and descendants normally inherit them. Set a \`border\` on \`body\`, and descendants do **not** each receive that border. Different properties have different inheritance rules.

That gives you a debugging question:

> Is this value declared on the selected element, or inherited from an ancestor?

The DevTools Styles pane groups inherited declarations under the ancestor that supplied them. The Computed pane shows the final value and can reveal where it came from.

## Name repeated values once

A [[term: custom property | An author-defined CSS property whose name starts with two hyphens and whose value can be reused with var().]] gives a meaningful name to a reusable value.

Add exactly these four color tokens to the root element:

\`\`\`css title=style.css
:root {
  --bg: #f7f5f0;
  --fg: #202124;
  --brand: #096b5a;
  --muted: #66706c;
}
\`\`\`

Then consume them:

\`\`\`css title=style.css
body {
  color: var(--fg);
  background-color: var(--bg);
}

a {
  color: var(--brand);
}
\`\`\`

Custom properties normally inherit, so declaring this palette on \`:root\` makes the names available throughout the document. DevTools can follow a \`var(--brand)\` use back to its declaration.

:::mcq
id: inheritance-source-check
title: Trace where a value came from
question: A paragraph has no color declaration. Its parent article has color: var(--muted), and :root defines --muted. Why is the paragraph text muted?
- [ ] border-inherits | Every CSS property automatically inherits from the nearest ancestor.
- [x] color-inherits | The paragraph inherits the article's computed \`color\`; \`var(--muted)\` supplies that color value.
- [ ] root-selects | The \`:root\` selector directly matches every paragraph.
- [ ] variable-selector | A custom property acts as a selector and targets descendants.
explanation: \`color\` inherits. The article computes its color from the custom property, and the paragraph receives that computed color because it has no winning color declaration of its own.
hint: Separate value lookup through \`var()\` from property inheritance through the document tree.
:::

<!-- step-id: cascade-decision-model -->
# The cascade chooses one declared value

Several rules can match the same element and declare the same property. The [[term: cascade | CSS's conflict-resolution process for choosing which declaration supplies a property's value on an element.]] resolves that conflict.

For the ordinary, unlayered, normal rules in today's stylesheet, ask these questions in order:

1. **Origin:** who supplied the declaration—browser, user, or page author? Ordinary author rules beat ordinary browser defaults.
2. **Specificity:** how narrowly does the selector identify the element?
3. **Source order:** if the earlier comparisons tie, which declaration appears later?

For today's specificity comparisons, remember only this ordering:

> inline style > \`#id\` > \`.class\`, \`[attribute]\`, or \`:pseudo-class\` > \`element\`

An inline \`style\` attribute belongs to the author origin but outranks ordinary selector rules in today's duel. If two selectors are in the same category and neither has additional parts that make it more specific, the later rule wins.

:::note A deliberately bounded model
The complete modern cascade also accounts for importance, cascade layers, scoping proximity, animations, and transitions. None appears in today's drill. Do not type \`!important\` and do not calculate specificity tuples. When a real codebase adds another cascade mechanism, inspect its evidence in DevTools and read that mechanism's documentation.
:::

:::sequence
id: ordinary-cascade-order
title: Apply today's cascade questions
question: Put the three conflict-resolution questions for today's ordinary rules in order.
- [2] specificity | Which matching selector is more specific?
- [3] source-order | If the earlier comparisons tie, which declaration appears later?
- [1] origin | Who supplied the declaration: browser, user, or page author?
explanation: For today's ordinary declarations, compare origin first, then specificity, then source order as the tie-breaker.
hint: The last rule wins only after the earlier cascade comparisons tie.
:::

<!-- step-id: specificity-prediction -->
# Predict the winner before opening DevTools

Suppose the HTML submit control is:

\`\`\`html title=index.html
<button id="send" class="submit-button" type="submit">Send message</button>
\`\`\`

And these rules all match it:

\`\`\`css title=specificity-duel.css
button { background-color: tomato; }
.submit-button { background-color: seagreen; }
#send { background-color: rebeccapurple; }
#send { background-color: navy; }
\`\`\`

Predict without running it:

1. Which color wins with all four rules?
2. Delete the last ID rule. Which wins now?
3. Delete the remaining ID rule. Which wins now?
4. Delete the class rule. Which wins now?
5. Restore all rules and add \`style="background-color: goldenrod"\` to the button. Which wins?

:::reveal Check the cascade, not your taste
With all four stylesheet rules, \`navy\` wins: the two ID selectors tie, so the later one wins. Delete it and \`rebeccapurple\` wins. Delete both ID rules and the class wins with \`seagreen\`. Delete the class and the element selector wins with \`tomato\`. Restore the rules and add the inline declaration; \`goldenrod\` wins today's ordinary duel.
:::

:::mcq
id: source-order-tie-break
title: Diagnose the final tie
question: Two #send rules from the same author stylesheet both set background-color. Neither uses a layer or !important. Why does the second rule win?
- [ ] id-always-navy | ID selectors always prefer darker colors.
- [ ] browser-origin | The second rule comes from the browser origin.
- [x] source-order | Origin and specificity tie, so later source order breaks the tie.
- [ ] inherited-color | Background color inherits from the second rule.
explanation: Both declarations have the same origin and selector specificity. The later declaration therefore wins by source order.
hint: Work through origin, specificity, and only then the final tie-breaker.
:::

<!-- lesson-step -->
<!-- step-id: devtools-evidence-map -->
# DevTools turns CSS into evidence

Open the browser's **Elements** panel and select one element. Four views answer different questions:

| Evidence | Question it answers |
| --- | --- |
| **Styles pane** | Which rules match, where are they defined, and which declarations were overridden or are inactive? |
| **File and line link** | Where should the permanent source edit happen? |
| **Computed pane** | What final value is the browser using for this property? |
| **Box-model diagram** | What content, padding, border, and margin sizes did layout produce? |

A struck-through declaration is evidence that it is not supplying the active value. Do not assume every strike-through has the same cause: another declaration may have won, the property may be inactive for the current display mode, or you may have toggled it off.

## The twenty-second property trace

1. Inspect the element.
2. In **Computed**, filter for the property and record its final value.
3. Expand or follow the property to its source declaration.
4. In **Styles**, read the winning selector and its file-and-line link.
5. Compare nearby overridden declarations.
6. State aloud why the winner won.

Double-click a value in Styles to test a hypothesis. The page updates and may reflow immediately. That live edit is temporary unless you have deliberately connected DevTools to local files, so copy the verified change into \`style.css\`.

:::remember Separate evidence from hypothesis
“This selector looks more specific” is a hypothesis. A winning declaration, a computed value, and the resulting box-model measurement are evidence.
:::

:::mcq
id: devtools-pane-choice
title: Choose the strongest evidence
question: You need the final font-size the browser is using in pixels and the declaration that supplied it. What should you inspect first?
- [ ] html-source | Only the page's HTML source
- [ ] console-guess | A guess typed into the Console
- [x] computed-trace | The Computed pane for the final value, then its source in Styles
- [ ] network-body | The Network response body only
explanation: Computed shows the final applied value; tracing it into Styles identifies the selector and source location responsible for it.
hint: One view answers “what value?” and the other answers “from which rule?”
:::

<!-- lesson-step -->
<!-- step-id: base-stylesheet-build -->
# Build 1: style the document without laying it out

Link \`style.css\` from yesterday's \`index.html\`, then build a well-set document. Use the page in your project, not a pasted replacement.

Inside the document's \`<head>\`, add:

\`\`\`html title=index.html
<link rel="stylesheet" href="style.css">
\`\`\`

That path means the two files sit in the same folder. If your files do not, make the path describe their real relationship instead of copying it blindly.

## Required result

- Add the three reset rules: global \`border-box\`, zero body margin, and block images capped at \`100%\`.
- Define exactly four color custom properties on \`:root\`: \`--bg\`, \`--fg\`, \`--brand\`, and \`--muted\`.
- Set body text to \`1rem\`, \`h1\` to \`2.5rem\`, \`h2\` to \`1.75rem\`, and \`h3\` to \`1.25rem\`.
- Choose one base spacing unit—\`1rem\` is enough—and use whole multiples such as \`1rem\`, \`2rem\`, and \`3rem\` for vertical rhythm.
- Use the color tokens for the page background, text, links or controls, and quieter secondary text.
- Keep the Day 3 keyboard-visible focus indicator. If you style focus, it must remain clearly visible.

## Hard constraints

Do **not** use \`display: flex\`, \`display: grid\`, any \`position\` value, \`float\`, \`!important\`, or inline styles. Do not spend the hour creating layout. The page should read like a carefully typeset document.

## Evidence pass

After each logical group of declarations:

1. Inspect one affected element.
2. Predict its computed \`font-size\`, \`color\`, or box spacing.
3. Confirm the value in Computed.
4. If the prediction fails, inspect the winning and crossed-out declarations before adding CSS.

:::tip If the stylesheet seems missing
Inspect \`body\`. If none of your author rules appears, check the \`<link>\` path in \`index.html\` and the CSS request in Network. A cascade problem has matching rules that lose; a loading problem gives the cascade no stylesheet rules to compare.
:::

<!-- lesson-step -->
<!-- step-id: specificity-duel-build -->
# Build 2: run the specificity duel

Use a scratch HTML/CSS file or a temporary section you will remove. Give the submit button a class and an ID, then create four competing background declarations:

1. an element selector;
2. a class selector;
3. an ID selector; and
4. an inline style.

Give every declaration a visibly different color. Before refreshing, write your predicted winner.

Then repeat this exact loop:

1. Inspect the submit button.
2. Name the winning declaration and why it wins.
3. Point to every crossed-out loser.
4. Remove the current winner.
5. Predict the next winner **before** looking.
6. Refresh or inspect again and reconcile the result.

After the inline declaration is gone, add a second class rule of equal specificity below the first. Predict the winner and prove the source-order tie-break.

Delete every duel rule and inline style when the experiment is complete. Your real stylesheet should not retain deliberately competing declarations.

:::warning Keep the form honest
The scratch styling must not change \`type="submit"\`, the button's visible focus, or the semantic button itself. This drill changes only competing CSS declarations.
:::

<!-- lesson-step -->
<!-- step-id: devtools-archaeology-drill -->
# Build 3: investigate CSS you did not write

Open a public site you did not build and pick a visible heading. Avoid private account, healthcare, banking, or company-admin pages if you plan to save screenshots.

Without reading the site's source files first, collect this evidence:

1. **Color:** What declaration sets the heading's final \`color\`? Record the selector, CSS file, and line.
2. **Size:** What is its computed \`font-size\` in pixels?
3. **Inheritance:** Where does its \`font-family\` come from? Record the ancestor if it is inherited.
4. **Box model:** Record its computed top margin, padding, and border.
5. **Live edit:** Change \`margin-top\` in Styles. Predict what nearby content will move, then watch the page reflow.
6. **Cascade:** Find one crossed-out declaration and state why it lost. If none is visible, add a temporary competing declaration and watch which one wins.

Use a timer. Run the color trace again on two different elements until each takes less than twenty seconds.

:::note Browser interfaces vary
These instructions use Chromium's current names, **Elements**, **Styles**, and **Computed**. Firefox and Safari expose equivalent CSS evidence with slightly different labels. The learning target is the evidence, not a screenshot-perfect toolbar location.
:::

For current reference while practicing, use [Chrome's official CSS DevTools reference](https://developer.chrome.com/docs/devtools/css/reference/) and the [CSS Box Sizing specification](https://www.w3.org/TR/css-sizing-3/), [CSS Cascade specification](https://www.w3.org/TR/css-cascade-6/), and [CSS Positioned Layout specification](https://www.w3.org/TR/css-position-3/) when a simplified rule stops predicting reality.

<!-- lesson-step -->
<!-- step-id: css-debugging-checkpoint -->
# Checkpoint: explain the winner from evidence

Use this unfamiliar case:

\`\`\`html
<main class="profile">
  <p id="status" class="muted">Available for work</p>
</main>
\`\`\`

\`\`\`css
:root { --fg: #202124; --muted: #66706c; }
body { color: var(--fg); }
p { color: teal; }
.muted { color: var(--muted); }
#status { color: purple; }
#status { color: navy; }
\`\`\`

Predict the final color before using DevTools. Then explain:

- which declarations match;
- whether inheritance supplies the final value;
- which cascade comparisons eliminate the losers;
- which rule wins; and
- what the Computed and Styles panes should show.

:::response
id: explain-css-winner
title: Explain the final color from cascade evidence
question: Predict the final color of #status and explain the result using matching declarations, inheritance, specificity, source order, and the evidence you expect in Styles and Computed.
rubric:
- Predicts navy as the final color
- Identifies the element, class, and both ID rules as matching declarations
- Explains that the ID selectors outrank the class and element selectors
- Uses later source order to choose the second ID rule over the first
- Explains that the paragraph's own winning declaration prevents inherited body color from supplying the final value
- Names Computed as evidence of the final value and Styles as evidence of the winning and overridden declarations
field-label: Your evidence-based explanation
placeholder: The final color is navy because...
max-length: 900
guide: Walk the cascade in order. Do not stop at “the last rule wins”; explain why source order becomes relevant only after the two ID rules tie.
:::

<!-- step-id: day-four-finish-line -->
# Your Day 4 finish line

You are done when your profile page has a readable base stylesheet with no layout rules and you can inspect any live heading and identify the declaration responsible for one property in under twenty seconds.

Before stopping, verify all of these without notes:

- Explain why \`border-box\` makes a declared width easier to reason about.
- Describe \`block\`, \`inline\`, \`inline-block\`, and \`none\` by their visible consequences.
- Name one suitable use each for \`px\`, \`rem\`, \`%\`, \`vh\`, and \`vw\`.
- Say what remains in normal flow for each \`position\` value and what supplies its reference.
- Predict a collapsed sibling margin instead of adding the values.
- Trace \`var(--brand)\` to its declaration and distinguish that lookup from inheritance.
- Apply origin → specificity → source order to an ordinary conflict.
- Use Styles, Computed, the source link, and the box-model diagram as evidence.

:::remember The durable debugging rule
When CSS looks wrong, do not add another declaration first. Select the element, find the computed property, trace the winning rule, form one hypothesis, change one value, and verify the result.
:::

## Fast revision: follow the evidence loop

Start at **Matching rules** and move clockwise: the browser resolves competing declarations through the cascade, exposes the final value in **Computed**, and uses that result while laying out the rendered box. Then follow **Inspect, then edit** back to the source: inspect the evidence, test one hypothesis, and only then make the permanent change. If the selected element has no winning declaration for an inheritable property, trace the value to the ancestor that supplied it.

![Matching CSS rules pass through origin, specificity, and source order to a cascade winner, which becomes the computed value used by the rendered box; inspection traces the rendered evidence back to the source before editing.](assets/lessons/day-004/css-evidence-loop-recap.png)
`;

export default defineMarkdownLesson({
  status:"published",
  title:"Box model, cascade, and DevTools",
  summary:"Build a predictable base stylesheet and use browser evidence to explain sizing, inheritance, and every ordinary cascade winner.",
  outcome:"Predict CSS results and identify the exact declaration supplying a property in DevTools in under twenty seconds.",
  mode:"Read → predict → build → inspect → explain",
  mission:"Replace CSS guessing with a repeatable evidence-first debugging loop.",
  duration:"4 hours",
  level:"Complete beginner",
  reward:40,
  passingScore:80,
}, LESSON_MARKDOWN, { day:4 });
