export interface IRequestConfig {
  path: string;
  method: "POST" | "GET";
  timeout?: number;
  body?: any;
  headers?: Record<string, string>;
}
