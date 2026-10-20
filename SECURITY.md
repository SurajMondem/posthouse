# Security

## Reporting a vulnerability

Please use GitHub's **Report a vulnerability** button on the repository's Security tab (private vulnerability
reporting). Don't open a public issue for security problems. You'll get a reply within a week.

## How posthouse handles secrets

- API keys are read only from environment variables or a git-ignored `.env` file (or, on macOS, the Keychain).
  posthouse never writes a key to disk, logs it, or sends it anywhere except the provider's own API.
- `posthouse.config.local.json`, `.env`, `videos/` and renders are git-ignored.
- The `command` voice provider runs a shell command you write in your own config. posthouse never builds that
  command from post content or any other outside input; the text to speak is passed through stdin or a temp file.

If you paste logs into an issue, remove any keys first.
