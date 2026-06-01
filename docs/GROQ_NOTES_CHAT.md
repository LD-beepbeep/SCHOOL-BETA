# Notes AI Setup (Groq + Gemini)

This feature is optional and disabled by default.

## 1) Create API key(s)
1. Open https://console.groq.com/keys
2. Create a Groq API key.
3. Copy the key (it starts with `gsk_...`).
4. (Optional) Open Google AI Studio and create a Gemini key (`AIza...`).

## 2) Enable Notes AI inside Student OS
1. Open **Settings**.
2. Go to **Notes AI (Optional)**.
3. Paste your key(s) in **Groq API Key** and/or **Gemini API Key**.
4. Pick a **Default Chat Model** (Groq or Gemini).
5. Turn on **Enable Groq Notes Chat**.

When this toggle is OFF, the Notes AI icon is hidden.

## 3) Use it in Notes
1. Open the **Notes** tab.
2. Click the sparkle icon in the notes toolbar.
3. Choose a model in the AI sidebar header (you can switch per chat).
4. Ask your question about the current note.
5. Use quick-question chips for instant prompts.

## Supported model presets
- `groq:llama-3.1-8b-instant`
- `groq:llama-3.3-70b-versatile`
- `gemini:gemini-2.0-flash`
- `gemini:gemini-1.5-flash`
