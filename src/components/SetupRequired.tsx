/**
 * Shown instead of the app when LIVEBLOCKS_SECRET_KEY is missing, so anyone
 * running the project for the first time gets instructions rather than an
 * app that silently cannot connect.
 */
export function SetupRequired() {
  return (
    <main className="setup">
      <div className="setup-card">
        <h1>Add a Liveblocks key to start commenting</h1>
        <p>
          Comments are stored and synced with Liveblocks, which needs a secret
          key. It takes about a minute:
        </p>
        <ol>
          <li>
            Create a free account at{" "}
            <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
              liveblocks.io
            </a>{" "}
            and copy the <strong>secret key</strong> (starts with{" "}
            <code>sk_</code>) from your project&apos;s API keys page.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and paste
            the key after <code>LIVEBLOCKS_SECRET_KEY=</code>.
          </li>
          <li>
            Restart <code>npm run dev</code> and reload this page.
          </li>
        </ol>
      </div>
    </main>
  );
}
