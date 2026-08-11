// Logik API helper functions
// These will be updated once actual network requests are captured

export async function exportBlueprint(blueprintName) {
  // TODO: Update this after capturing real network requests
  // The endpoint and payload structure will be determined by inspecting
  // the Logik admin UI export request in browser dev tools

  const response = await fetch('/api/v1/blueprints/export', {
    method: 'POST',
    credentials: 'include', // Use the admin's existing session
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blueprintName,
      fullBlueprintMigration: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  return response.blob();
}

export async function importBlueprint(blueprintZip, blueprintName) {
  // TODO: Update this after capturing real network requests
  // Determine whether to use Matrix Loader UI or lower-level API

  const formData = new FormData();
  formData.append('file', blueprintZip, 'blueprint.zip');
  formData.append('blueprintName', blueprintName);

  const response = await fetch('/api/v1/blueprints/import', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Import failed: ${response.statusText}`);
  }

  return response.json();
}
