import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getCurrentUser, can } from '@/server/auth/rbac';

// Token handler for direct client → Vercel Blob uploads. The browser asks
// this route for a scoped upload token, then streams the file straight to
// Blob storage — never through a serverless function body (1MB/4.5MB limits).
// After the upload completes the client calls the `registerUpload` server
// action to create the media row (works on localhost, unlike the
// onUploadCompleted webhook which requires a public callback URL).
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user || !can(user, 'media:write')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/avif',
          'image/gif',
          'image/svg+xml',
        ],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10MB cap (files are webp-compressed client-side first)
        addRandomSuffix: true,
      }),
      // Registration happens via the registerUpload server action instead.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    );
  }
}
