import { db } from '../db.ts';
import { integrationContext } from '../context.ts';
import { actorForUser } from '../auth.ts';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Cache for access token
let cachedAccessToken = null;
let tokenExpiry = 0;
// Base64 URL encode
function base64UrlEncode(data) {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// HMAC-SHA256 signed short-lived stream token: base64url(fileId).base64url(exp).base64url(sig)
async function signStreamToken(fileId, userId, ttlSeconds = 300) {
    const secret = process.env.DRIVE_STREAM_SECRET;
    if (!secret)
        throw new Error('DRIVE_STREAM_SECRET not configured');
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${fileId}.${userId}.${exp}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
    return `${base64UrlEncode(new TextEncoder().encode(payload))}.${base64UrlEncode(sig)}`;
}
async function verifyStreamToken(token, fileId) {
    try {
        const secret = process.env.DRIVE_STREAM_SECRET;
        if (!secret)
            return false;
        const [payloadB64, sigB64] = token.split('.');
        if (!payloadB64 || !sigB64)
            return false;
        const pad = (s) => s + '==='.slice((s.length + 3) % 4);
        const payload = atob(pad(payloadB64).replace(/-/g, '+').replace(/_/g, '/'));
        const [tokFileId, _userId, expStr] = payload.split('.');
        if (tokFileId !== fileId)
            return false;
        const exp = parseInt(expStr, 10);
        if (!exp || Date.now() / 1000 > exp)
            return false;
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        const sigBytes = Uint8Array.from(atob(pad(sigB64).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
        return valid && !!await actorForUser(_userId);
    }
    catch {
        return false;
    }
}
// Create JWT for Google API
async function createJWT(serviceAccount) {
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
    const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey, {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
    }, false, ['sign']);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken));
    const signatureBase64 = base64UrlEncode(new Uint8Array(signature));
    return `${unsignedToken}.${signatureBase64}`;
}
// Get access token from Google
async function getAccessToken(serviceAccount) {
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
export async function listFiles(accessToken, folderId) {
  return listPages(accessToken, "'" + folderId + "' in parents and trashed = false");
}
export async function listPages(accessToken, query) {
  const files=[]; let pageToken='';
  do {
    const params=new URLSearchParams({q:query,fields:'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,webContentLink,iconLink)',orderBy:'folder,name',pageSize:'100'});
    if(pageToken)params.set('pageToken',pageToken);
    const response=await fetch('https://www.googleapis.com/drive/v3/files?'+params,{headers:{Authorization:'Bearer '+accessToken}});
    if(!response.ok)throw new Error('Não foi possível listar os arquivos do Drive');
    const data=await response.json(); files.push(...(data.files||[]));pageToken=data.nextPageToken||'';
    if(files.length>10000)throw new Error('Pasta muito extensa; use uma busca mais específica');
  }while(pageToken);
  return files;
}
// Get thumbnail for file (uses Google's thumbnail for videos, full image for images)
async function getFileThumbnail(accessToken, fileId) {
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
    }
    catch (e) {
        console.error('Error getting thumbnail:', e);
        return null;
    }
}
// Stream media file (video/audio) with range request support
async function streamMedia(accessToken, fileId, rangeHeader) {
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
        const fileSize = parseInt(meta.size || '0');
        // Handle range requests for seeking
        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024, fileSize - 1); // 10MB chunks
            const chunkSize = end - start + 1;
            console.log(`Range request: ${start}-${end}/${fileSize}`);
            // Stream the file content with range
            const contentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            const contentResponse = await fetch(contentUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Range': `bytes=${start}-${end}`,
                },
            });
            if (!contentResponse.ok && contentResponse.status !== 206) {
                throw new Error('Failed to stream file');
            }
            return new Response(contentResponse.body, {
                status: 206,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
                    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
                    'Content-Type': meta.mimeType || 'video/mp4',
                    'Content-Length': chunkSize.toString(),
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'private, no-store',
                },
            });
        }
        // No range header - return full file info for initial request
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
                'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
                'Content-Type': meta.mimeType || 'application/octet-stream',
                'Content-Length': meta.size || '',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'private, no-store',
            },
        });
    }
    catch (e) {
        console.error('Error streaming media:', e);
        throw e;
    }
}
// Search files
async function searchFiles(accessToken, folderId, searchQuery) {
    // Sanitize folderId: Google Drive IDs are URL-safe base64 (letters, digits, _, -)
    const safeFolderId = folderId.replace(/[^a-zA-Z0-9_-]/g, '');
    // Sanitize search input: escape single quotes and backslashes used by Drive's query language
    const safeSearch = searchQuery
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .slice(0, 200);
    const query = `'${safeFolderId}' in parents and trashed = false and name contains '${safeSearch}'`;
    return listPages(accessToken, query);
}
// Get file metadata
async function getFile(accessToken, fileId) {
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
export async function isAllowedResource(accessToken, id, configuredRoots) {
  if(!id || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) return false;
  const roots=configuredRoots || [...(await db.client_drive_folders.findMany({select:{folder_id:true}})).map(row=>row.folder_id),process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID||''].map(value=>value.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1]||value).filter(Boolean);
  const allowed=new Set(roots),seen=new Set(),pending=[id];
  while(pending.length&&seen.size<100){
    const current=pending.pop();if(allowed.has(current))return true;if(seen.has(current))continue;seen.add(current);
    const response=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(current)+'?fields=parents',{headers:{Authorization:'Bearer '+accessToken}});
    if(!response.ok)continue;
    const meta=await response.json();pending.push(...(meta.parents||[]));
  }
  return false;
}
export default async function handler(req) {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    try {
        // Parse URL early to check for token query param (for streaming)
        const url = new URL(req.url);
        const action = url.searchParams.get('action');
        const streamFileIdParam = url.searchParams.get('fileId');
        const streamTokenParam = url.searchParams.get('st');
        const actor=integrationContext.getStore()?.actor;
        if(action==='stream'){
          if(!streamFileIdParam||!streamTokenParam||!await verifyStreamToken(streamTokenParam,streamFileIdParam))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{'Content-Type':'application/json'}});
        }else if(!actor)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{'Content-Type':'application/json'}});
        // Get service account key
        const serviceAccountKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKeyJson) {
            return new Response(JSON.stringify({error:'Configure a conta de serviço do Google Drive no servidor'}),{status:503,headers:{'Content-Type':'application/json'}});
        }
        const serviceAccount = JSON.parse(serviceAccountKeyJson);
        const accessToken = await getAccessToken(serviceAccount);
        // Helper to extract folder ID from URL or return as-is
        const extractFolderId = (input) => {
            if (!input)
                return null;
            // If it's a Google Drive URL, extract the folder ID
            const match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
            if (match)
                return match[1];
            // Otherwise return as-is (assuming it's already an ID)
            return input;
        };
        // Get additional params
        const rawFolderId = url.searchParams.get('folderId') || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
        const folderId = extractFolderId(rawFolderId);
        const fileId = url.searchParams.get('fileId');
        const searchQuery = url.searchParams.get('search');
        const rangeHeader = req.headers.get('Range');
        const resource=fileId||folderId;
        if(!await isAllowedResource(accessToken,resource))return new Response(JSON.stringify({error:'Arquivo ou pasta fora das pastas cadastradas'}),{status:403,headers:{'Content-Type':'application/json'}});
        if(action==='streamToken'){
          if(!fileId)return new Response(JSON.stringify({error:'Arquivo obrigatório'}),{status:400,headers:{'Content-Type':'application/json'}});
          return new Response(JSON.stringify({token:await signStreamToken(fileId,actor.id,300),expiresIn:300}),{headers:{'Content-Type':'application/json'}});
        }
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
                            'Cache-Control': 'private, no-store',
                        },
                    });
                }
                return new Response(null, { status: 404, headers: corsHeaders });
            case 'stream':
                if (!fileId) {
                    throw new Error('File ID is required');
                }
                return await streamMedia(accessToken, fileId, rangeHeader);
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
    }
    catch (error) {
        console.error('Google Drive error:', error);
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
