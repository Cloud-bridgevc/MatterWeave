import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import type { TenantContext } from './db.js';

/**
 * Tenant and user identity come ONLY from the verified JWT (API Gateway JWT
 * authorizer backed by Cognito / customer SAML IdP). Request bodies and query
 * strings are never trusted for tenant_id.
 */
export function tenantContext(event: APIGatewayProxyEventV2WithJWTAuthorizer): TenantContext {
  const claims = event.requestContext.authorizer.jwt.claims;
  const tenantId = String(claims['custom:tenant_id'] ?? '');
  const userId = String(claims['custom:mw_user_id'] ?? '');
  if (!/^[0-9a-f-]{36}$/.test(tenantId) || !/^[0-9a-f-]{36}$/.test(userId)) {
    throw Object.assign(new Error('Missing tenant context'), { statusCode: 401 });
  }
  return { tenantId, userId, requestId: event.requestContext.requestId };
}

export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});
