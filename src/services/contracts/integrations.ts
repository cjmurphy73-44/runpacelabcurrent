export interface IntegrationsService {
  invokeLLM(payload: Record<string, any>): Promise<any>;
  uploadPublicFile(file: File | Blob | string, options?: Record<string, any>): Promise<any>;
  uploadPrivateFile(file: File | Blob | string, options?: Record<string, any>): Promise<any>;
  generateImage(payload: Record<string, any>): Promise<any>;
  generateSpeech(payload: Record<string, any>): Promise<any>;
  sendEmail(payload: Record<string, any>): Promise<any>;
  createFileSignedUrl(payload: Record<string, any>): Promise<any>;
  extractDataFromUploadedFile(payload: Record<string, any>): Promise<any>;
}

export interface ConnectorGateway {
  airtable(action: string, payload: Record<string, any>): Promise<any>;
  github(action: string, payload: Record<string, any>): Promise<any>;
  [key: string]: (action: string, payload: Record<string, any>) => Promise<any>;
}
