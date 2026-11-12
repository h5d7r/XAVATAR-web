# Add a language

1. Copy `JSON/en.json` to `JSON/xx.json`. Use your language code for `xx`, such as `fr` or `pt-BR`.
2. Set `name` to the language's name in that language. Set `direction` to `ltr` or `rtl`.
3. Add an SVG flag to `SVG/` and set `flag` to its path, such as `SVG/fr.svg`. Match the capitalization exactly.
4. Translate the values under `messages`. Keep the message keys and placeholders such as `{name}`, `{count}`, and `{extension}`. You can move placeholders within a sentence. For messages with plural forms, follow the categories for your language and always include `other`. See `JSON/ar.json` for a right-to-left example.
5. Run `npm run dev` from the project root and select your language from the menu. The site picks up new JSON files automatically. Open a pull request with your JSON and SVG files when ready.

To use a custom font for your language, follow [the font instructions](FONTS/README.md).
