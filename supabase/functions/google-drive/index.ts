import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
}

// Cache for access token
let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

// Base64 URL encode
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create JWT for Google API
async function createJWT(serviceAccount: ServiceAccountKey): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const headerBase64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadBase64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerBase64}.${payloadBase64}`;

  // Parse the private key
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBase64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureBase64}`;
}

// Get access token from Google
async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && tokenExpiry > now + 300000) {
    return cachedAccessToken;
  }

  const jwt = await createJWT(serviceAccount);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token error:', error);
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000);
  
  return data.access_token;
}

// List files in a folder
async function listFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,webContentLink,iconLink)';
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name&pageSize=100`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('List files error:', error);
    throw new Error(`Failed to list files: ${error}`);
  }

  const data = await response.json();
  return data.files || [];
}

// Get thumbnail for file (uses Google's thumbnail for videos, full image for images)
async function getFileThumbnail(accessToken: string, fileId: string): Promise<{ body: ReadableStream<Uint8Array>; mimeType: string } | null> {
  try {
    console.log(`Getting thumbnail for fileId: ${fileId}`);
    
    // First get file metadata including thumbnailLink
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,size,name,thumbnailLink`;
    const metaResponse = await fetch(metaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!metaResponse.ok) {
      console.error(`Failed to get file metadata: ${metaResponse.status}`);
      return null;
    }
    
    const meta = await metaResponse.json();
    console.log(`File metadata: ${JSON.stringify(meta)}`);
    
    // For videos/audio, use Google's generated thumbnail
    if (meta.mimeType?.startsWith('video/') || meta.mimeType?.startsWith('audio/')) {
      if (meta.thumbnailLink) {
        // Get higher resolution thumbnail
        const thumbUrl = meta.thumbnailLink.replace('=s220', '=s400');
        console.log(`Fetching video thumbnail from: ${thumbUrl}`);
        
        const thumbResponse = await fetch(thumbUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (thumbResponse.ok && thumbResponse.body) {
          return { body: thumbResponse.body, mimeType: 'image/jpeg' };
        }
      }
      return null;
    }
    
    // For images, get the actual content
    if (meta.mimeType?.startsWith('image/')) {
      const contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      console.log(`Fetching image content from: ${contentUrl}`);
      
      const contentResponse = await fetch(contentUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      console.log(`Content response status: ${contentResponse.status}`);
      
      if (contentResponse.ok && contentResponse.body) {
        return { body: contentResponse.body, mimeType: meta.mimeType };
      }
    }
    
    // For other files, try to use thumbnailLink
    if (meta.thumbnailLink) {
      const thumbUrl = meta.thumbnailLink.replace('=s220', '=s400');
      const thumbResponse = await fetch(thumbUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (thumbResponse.ok && thumbResponse.body) {
        return { body: thumbResponse.body, mimeType: 'image/png' };
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error getting thumbnail:', e);
    return null;
  }
}

// Stream media file (video/audio)
async function streamMedia(accessToken: string, fileId: string): Promise<Response> {
  try {
    // First get file metadata
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,size,name`;
    const metaResponse = await fetch(metaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!metaResponse.ok) {
      throw new Error('File not found');
    }
    
    const meta = await metaResponse.json();
    
    // Stream the file content
    const contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const contentResponse = await fetch(contentUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!contentResponse.ok) {
      throw new Error('Failed to stream file');
    }
    
    // Return the stream with proper headers
    return new Response(contentResponse.body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Length': meta.size || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('Error streaming media:', e);
    throw e;
  }
}

// Search files
async function searchFiles(accessToken: string, folderId: string, searchQuery: string): Promise<DriveFile[]> {
  const query = `'${folderId}' in parents and trashed = false and name contains '${searchQuery}'`;
  const fields = 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,webContentLink,iconLink)';
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name&pageSize=50`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to search files: ${error}`);
  }

  const data = await response.json();
  return data.files || [];
}

// Get file metadata
async function getFile(accessToken: string, fileId: string): Promise<DriveFile> {
  const fields = 'id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,webContentLink,iconLink';
  
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get file: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get service account key
    const serviceAccountKeyJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKeyJson) {
      throw new Error('Google Service Account key not configured');
    }

    const serviceAccount: ServiceAccountKey = JSON.parse(serviceAccountKeyJson);
    const accessToken = await getAccessToken(serviceAccount);

    // Helper to extract folder ID from URL or return as-is
    const extractFolderId = (input: string | null | undefined): string | null => {
      if (!input) return null;
      // If it's a Google Drive URL, extract the folder ID
      const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      // Otherwise return as-is (assuming it's already an ID)
      return input;
    };

    // Parse URL and get action
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const rawFolderId = url.searchParams.get('folderId') || Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID');
    const folderId = extractFolderId(rawFolderId);
    const fileId = url.searchParams.get('fileId');
    const searchQuery = url.searchParams.get('search');

    console.log(`Google Drive action: ${action}, folderId: ${folderId}, fileId: ${fileId}`);

    let result;

    switch (action) {
      case 'list':
        if (!folderId) {
          throw new Error('Folder ID is required');
        }
        result = await listFiles(accessToken, folderId);
        break;

      case 'search':
        if (!folderId || !searchQuery) {
          throw new Error('Folder ID and search query are required');
        }
        result = await searchFiles(accessToken, folderId, searchQuery);
        break;

      case 'file':
        if (!fileId) {
          throw new Error('File ID is required');
        }
        result = await getFile(accessToken, fileId);
        break;

      case 'thumbnail':
        if (!fileId) {
          throw new Error('File ID is required');
        }
        const thumbnail = await getFileThumbnail(accessToken, fileId);
        if (thumbnail) {
          return new Response(thumbnail.body, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': thumbnail.mimeType,
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
        return new Response(null, { status: 404, headers: corsHeaders });

      case 'stream':
        if (!fileId) {
          throw new Error('File ID is required');
        }
        return await streamMedia(accessToken, fileId);

      default:
        // Default to list with root folder
        if (!folderId) {
          throw new Error('Folder ID is required');
        }
        result = await listFiles(accessToken, folderId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Google Drive error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
