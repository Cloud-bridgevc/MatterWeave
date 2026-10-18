import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const sm = new SecretsManagerClient({});
const cache = new Map<string, unknown>();

export async function getSecretJson<T>(arn: string): Promise<T> {
  if (cache.has(arn)) return cache.get(arn) as T;
  const res = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
  const value = JSON.parse(res.SecretString ?? '{}') as T;
  cache.set(arn, value);
  return value;
}
