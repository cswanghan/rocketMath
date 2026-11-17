# English curriculum

The existing `content/grade*.json` files remain the Chinese mathematical source.
`content/en/grade*.json` are complete English editions with the same structure,
IDs, order, answer values, choice IDs and correctness flags. They are generated
from exact-source translation memory, not translated during app use.

- `en.json`: draft translation memory (local model plus existing catalog).
- `reviewed.json`: editorial corrections, taking precedence over draft memory.
- `word_answers.json`: all seven reviewed worded expected-answer translations.
- `equivalences.json`: individually reviewed numeric-token differences, pinned to
  the exact English text with a reason. A later edit invalidates the exception.
- `glossary.json`: mathematical terminology used for an additional review queue.

After changing a Chinese generator or pack:

1. Translate new/changed complete strings. `draft_english.py` is an optional
   local-only Ollama/llama.cpp drafting tool; it is not needed to build the app.
2. Review prompts, distractors, hints, explanations, field labels and titles.
   Use `review_queue.py` and `review_terms.py`; review word problems in context.
3. Run `npm run content:english`, then `npm run test:localization`.
4. Run the iOS `CurriculumLocalizationTests` and curriculum UI tests.

`build_english.py` refuses to write incomplete packs. `--check` detects stale
outputs. `verify_english.py` checks every JSON leaf, question/choice structure,
answers, numeric tokens, signs, operators, dimensional units and remaining Han
characters. It generates `ios/build/codex-i18n/COVERAGE.md` and detailed JSON
review results. Prose equivalence still requires editorial review.

The native loader selects `content/en` for English and `content` for Chinese.
Missing English files throw rather than loading Chinese. `content/en/strings.json`
also supports displaying historical mistake text in the newly selected language;
stored records are not rewritten. Speech uses the same localized prompts.

The native app loads the three math packs for each grade 3–9. The separate
`english_practice_pack.json` and `exam_calendar.json` are not loaded by the native
curriculum and are outside this translation set.
