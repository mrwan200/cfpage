export interface CFResponse<D> {
  success: boolean;
  errors: Error[];
  messages: any[];
  result: D;
}

interface Error {
  code: number;
  message: string;
}
