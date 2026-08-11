// GitHub API helper functions
// Uses GitHub REST API v3 and Git Data API

export async function createCommit(token, owner, repo, fileTree, message) {
  // Step 1: Create a tree from the file tree
  const treeResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        tree: fileTree, // Array of {path, mode, type, content}
      }),
    }
  );

  if (!treeResponse.ok) {
    throw new Error(
      `Failed to create tree: ${treeResponse.statusText} ${await treeResponse.text()}`
    );
  }

  const { sha: treeSha } = await treeResponse.json();

  // Step 2: Get the latest commit SHA to use as parent
  const latestCommitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  let parentSha = null;
  if (latestCommitResponse.ok) {
    const ref = await latestCommitResponse.json();
    parentSha = ref.object.sha;
  }

  // Step 3: Create the commit
  const commitPayload = {
    message,
    tree: treeSha,
    author: {
      name: 'Logik Blueprint Extension',
      email: 'logik-extension@example.com',
      date: new Date().toISOString(),
    },
  };

  if (parentSha) {
    commitPayload.parents = [parentSha];
  }

  const commitResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(commitPayload),
    }
  );

  if (!commitResponse.ok) {
    throw new Error(
      `Failed to create commit: ${commitResponse.statusText} ${await commitResponse.text()}`
    );
  }

  const { sha: commitSha } = await commitResponse.json();

  // Step 4: Update the main branch ref to point to the new commit
  const refResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        sha: commitSha,
        force: false,
      }),
    }
  );

  if (!refResponse.ok) {
    throw new Error(
      `Failed to update ref: ${refResponse.statusText} ${await refResponse.text()}`
    );
  }

  return commitSha;
}

export async function listCommits(token, owner, repo) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list commits: ${response.statusText}`);
  }

  return response.json();
}
