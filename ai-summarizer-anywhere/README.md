# AI Summarizer Anywhere

Chrome extension to summarize highlighted text using multiple AI providers:
- OpenAI (GPT-3.5 / GPT-4, requires API key)
- Hugging Face (free summarization models, API key optional)
- Ollama (local models like LLaMA, Mistral — no key needed)

## Setup
1. Run `npm install canvas`
2. Run `node setup.js` (this generates the extension files)
3. Open Chrome → `chrome://extensions/`
4. Enable Developer Mode → Load Unpacked → select `ai-summarizer-anywhere/`
5. In the popup, choose a provider and enter your API key if required.

Then highlight text → right-click → Summarize with AI.