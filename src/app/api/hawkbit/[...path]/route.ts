import { NextRequest, NextResponse } from 'next/server';
import { environment } from '@/config/env';
import axios, { AxiosError } from 'axios';
import { getToken } from 'next-auth/jwt';
import { hasPermission } from '@/utils/permissions';
import { recordAuditEvent } from '@/lib/admin-users';

const resolveToken = async (request: NextRequest) => {
  const token = await getToken({ req: request });
  return token?.hawkbitAuth && typeof token.hawkbitAuth === 'string' ? token : undefined;
};

const requiredPermissionForRequest = (method: string, path: string): string | null => {
  const [resource, idOrAction, nestedAction] = path.split('/');
  const action = nestedAction ?? idOrAction;

  if (method === 'GET') {
    if (resource === 'rollouts') return 'READ_ROLLOUT';
    if (resource === 'targets' || resource === 'targettags' || resource === 'targetfilters') return 'READ_TARGET';
    if (resource === 'targettypes') return 'READ_TARGET_TYPE';
    if (resource === 'system') return 'READ_TENANT_CONFIGURATION';
    if (resource === 'distributionsets' || resource === 'distributionsettags' || resource === 'distributionsettypes') return 'READ_DISTRIBUTION_SET';
    if (resource === 'softwaremodules' || resource === 'softwaremoduletypes') return 'READ_DISTRIBUTION_SET';
    return null;
  }

  if (resource === 'rollouts') {
    if (method === 'POST' && action === 'approve') return 'APPROVE_ROLLOUT';
    if (method === 'POST' && ['start', 'resume', 'pause', 'triggerNextGroup'].includes(action)) return 'HANDLE_ROLLOUT';
    if (method === 'POST') return 'CREATE_ROLLOUT';
    if (method === 'PUT') return 'UPDATE_ROLLOUT';
    if (method === 'DELETE') return 'DELETE_ROLLOUT';
  }

  if (resource === 'targets' || resource === 'targettags' || resource === 'targetfilters' || resource === 'targettypes') {
    if (method === 'POST') return 'CREATE_TARGET';
    if (method === 'PUT') return 'UPDATE_TARGET';
    if (method === 'DELETE') return 'DELETE_TARGET';
  }

  if (resource === 'system') {
    return 'UPDATE_TENANT_CONFIGURATION';
  }

  if (resource === 'distributionsets' || resource === 'distributionsettags' || resource === 'softwaremodules') {
    if (method === 'POST') return 'CREATE_DISTRIBUTION_SET';
    if (method === 'PUT') return 'UPDATE_DISTRIBUTION_SET';
    if (method === 'DELETE') return 'DELETE_DISTRIBUTION_SET';
  }

  if (resource === 'distributionsettypes' || resource === 'softwaremoduletypes') {
    if (method === 'POST') return 'CREATE_DISTRIBUTION_SET_TYPE';
    if (method === 'PUT') return 'UPDATE_DISTRIBUTION_SET_TYPE';
    if (method === 'DELETE') return 'DELETE_DISTRIBUTION_SET_TYPE';
  }

  return null;
};

const assertAuthorized = async (request: NextRequest, method: string, path: string) => {
  const token = await resolveToken(request);
  if (!token) {
    return {
      token: null,
      response: NextResponse.json(
        {
          exceptionClass: 'UnauthorizedError',
          errorCode: 'UNAUTHORIZED',
          message: 'Unauthorized',
          info: {},
        },
        { status: 401 }
      ),
    };
  }

  const requiredPermission = requiredPermissionForRequest(method, path);
  const permissions = Array.isArray(token.permissions) ? token.permissions : [];
  if (requiredPermission && !hasPermission(permissions, requiredPermission)) {
    return {
      token: null,
      response: NextResponse.json(
        {
          exceptionClass: 'ForbiddenError',
          errorCode: 'FORBIDDEN',
          message: `${requiredPermission} permission required`,
          info: {},
        },
        { status: 403 }
      ),
    };
  }

  return { token, response: null };
};

const handleApiError = (error: unknown) => {
  if (error instanceof AxiosError) {
    if (error.response) {
      return NextResponse.json(error.response.data, {
        status: error.response.status,
      });
    }
    if (error.request) {
      return NextResponse.json(
        {
          exceptionClass: 'NetworkError',
          errorCode: 'NETWORK_ERROR',
          message: 'No response from Hawkbit API',
          info: {},
        },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(
    {
      exceptionClass: 'InternalError',
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to fetch from Hawkbit API',
      info: {},
    },
    { status: 500 }
  );
};

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { params } = context;
  const path = (await params).path.join('/');
  const { token, response: authError } = await assertAuthorized(request, 'GET', path);

  if (authError) {
    return authError;
  }

  try {
    // Extract query params from the request URL
    const url = new URL(request.url);
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const acceptHeader = request.headers.get('accept') ?? 'application/json, application/hal+json';

    const isBinaryExpected = acceptHeader.includes('application/octet-stream') || acceptHeader.includes('image') || acceptHeader === '*/*';

    const axiosResponse = await axios.get(`${environment.hawkbitApiUrl}/rest/v1/${path}`, {
      headers: {
        Authorization: `Basic ${token?.hawkbitAuth}`,
        Accept: acceptHeader,
      },
      params: queryParams,
      responseType: isBinaryExpected ? 'arraybuffer' : 'json',
    });

    if (isBinaryExpected) {
      return new NextResponse(axiosResponse.data, {
        status: axiosResponse.status,
        headers: {
          'Content-Type': axiosResponse.headers['content-type'] ?? 'application/octet-stream',
          'Content-Disposition': axiosResponse.headers['content-disposition'] ?? '',
        },
      });
    }

    return NextResponse.json(axiosResponse.data, { status: axiosResponse.status });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { params } = context;
  const path = (await params).path.join('/');
  const { token, response: authError } = await assertAuthorized(request, 'POST', path);

  if (authError) {
    return authError;
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    let body: FormData | unknown;
    const headers: Record<string, string> = {
      Authorization: `Basic ${token?.hawkbitAuth}`,
      Accept: 'application/json, application/hal+json',
    };

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = formData;
    } else {
      // Check if request has a body before parsing
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
      headers['Content-Type'] = 'application/json';
    }

    const response = await axios.post(`${environment.hawkbitApiUrl}/rest/v1/${path}`, body, {
      headers,
    });

    await recordAuditEvent({
      actor: typeof token?.username === 'string' ? token.username : 'unknown',
      action: `hawkbit:${request.method.toLowerCase()}`,
      subject: path,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { params } = context;
  const path = (await params).path.join('/');
  const { token, response: authError } = await assertAuthorized(request, 'PUT', path);

  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();

    const response = await axios.put(`${environment.hawkbitApiUrl}/rest/v1/${path}`, body, {
      headers: {
        Authorization: `Basic ${token?.hawkbitAuth}`,
        Accept: 'application/json, application/hal+json',
        'Content-Type': 'application/json',
      },
    });

    await recordAuditEvent({
      actor: typeof token?.username === 'string' ? token.username : 'unknown',
      action: `hawkbit:${request.method.toLowerCase()}`,
      subject: path,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { params } = context;
  const path = (await params).path.join('/');
  const { token, response: authError } = await assertAuthorized(request, 'DELETE', path);

  if (authError) {
    return authError;
  }

  try {
    const response = await axios.delete(`${environment.hawkbitApiUrl}/rest/v1/${path}`, {
      headers: {
        Authorization: `Basic ${token?.hawkbitAuth}`,
        Accept: 'application/json, application/hal+json',
      },
    });

    await recordAuditEvent({
      actor: typeof token?.username === 'string' ? token.username : 'unknown',
      action: `hawkbit:${request.method.toLowerCase()}`,
      subject: path,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}
