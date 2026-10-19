export interface Config {
  host: string;
  port: number;
  staticDir: string;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    host: env.HOST || '0.0.0.0',
    port: positiveInt(env.PORT, 3000),
    staticDir: env.STATIC_DIR || 'dist/web',
  };
}
