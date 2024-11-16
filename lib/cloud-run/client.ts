import { cookies } from 'next/headers';
import { getServerUser } from '../server-auth';
import { getAuthHeaders } from '../headers';

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL;

if (!CLOUD_RUN_API_URL) {
  throw new Error('CLOUD_RUN_API_URL is not set in the environment variables');
}

async function getFirebaseToken(): Promise<string | null> {
  const cookieStore = cookies();
  return cookieStore.get('session')?.value || null;
}

export async function callCloudRunAPI(endpoint: string, method: string, body?: any) {
  const user = await getServerUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const token = await getFirebaseToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const fullUrl = `${CLOUD_RUN_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const headers = await getAuthHeaders();
    
    // Add debugging logs
    console.log('Making Cloud Run request with user:', user.uid);
    
    const requestBody = {
      ...body,
      userId: user.uid,
      // Add these explicitly to help debug
      metadata: {
        userId: user.uid,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Request body:', requestBody);

    const response = await fetch(fullUrl, {
      method,
      headers: {
        ...headers,
        'Authorization': `Bearer ${token}`,
        'X-User-ID': user.uid
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      next: { revalidate: 0 }
    });

    clearTimeout(timeoutId);
    const responseText = await response.text();

    console.log('Cloud Run Response:', responseText);

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      console.error(`Error body: ${responseText}`);
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 60 seconds');
      }
      console.error('Error in API call:', err);
      throw err;
    }
    console.error('Unknown error in API call');
    throw new Error('An unknown error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
}