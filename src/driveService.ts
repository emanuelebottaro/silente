export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

/**
 * Gets or creates a Google Drive folder by its name.
 */
export async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`;

  const res = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive API error searching folder: ${text}`);
  }

  const searchData = await res.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Folder not found, create it
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(folderMetadata),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Google Drive API error creating folder: ${text}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Lists text files accessible to the app (within drive.file scope and inside the 'Lele Writer' folder)
 */
export async function listDriveFiles(accessToken: string): Promise<DriveFile[]> {
  try {
    let folderQuery = '';
    try {
      const folderId = await getOrCreateFolder(accessToken, 'Lele Writer');
      folderQuery = `'${folderId}' in parents and `;
    } catch (err) {
      console.warn('Could not retrieve or create Lele Writer folder for listing:', err);
    }

    const query = encodeURIComponent(`${folderQuery}(mimeType = 'text/plain' or mimeType = 'text/markdown' or name contains '.txt' or name contains '.md' or name contains '.html')`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name, modifiedTime, size)&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error listing files: ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('listDriveFiles error:', error);
    throw error;
  }
}

/**
 * Downloads a file's content by its Google Drive file ID
 */
export async function getDriveFileContent(accessToken: string, fileId: string): Promise<string> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error fetching file content: ${errText}`);
    }

    return await res.text();
  } catch (error) {
    console.error('getDriveFileContent error:', error);
    throw error;
  }
}

/**
 * Creates a new file on Google Drive inside the 'Lele Writer' folder using a multipart upload
 */
export async function createDriveFile(
  accessToken: string,
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<DriveFile> {
  try {
    let folderId: string | null = null;
    try {
      folderId = await getOrCreateFolder(accessToken, 'Lele Writer');
    } catch (err) {
      console.warn('Could not locate or create Lele Writer folder for upload, saving in root fallback:', err);
    }

    const boundary = 'focuswriter_upload_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata: Record<string, any> = {
      name: filename,
      mimeType: mimeType,
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      content +
      closeDelimiter;

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size';

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error creating file: ${errText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('createDriveFile error:', error);
    throw error;
  }
}

/**
 * Updates an existing file's name and content on Google Drive using a multipart PATCH
 */
export async function updateDriveFile(
  accessToken: string,
  fileId: string,
  filename: string,
  content: string,
  mimeType: string = 'text/plain'
): Promise<DriveFile> {
  try {
    const boundary = 'focuswriter_update_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
    };

    const body =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
      content +
      closeDelimiter;

    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,modifiedTime,size`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error updating file: ${errText}`);
    }

    return await res.json();
  } catch (error) {
    console.error('updateDriveFile error:', error);
    throw error;
  }
}

/**
 * Trashes a file from Google Drive
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Drive API error deleting file: ${errText}`);
    }
  } catch (error) {
    console.error('deleteDriveFile error:', error);
    throw error;
  }
}
