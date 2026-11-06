export function extractSendToCustomerText(transcript: string): string | null
export function parseSendToCustomer(transcript: string): { body: string; targetName: string | null } | null
export function findConvoByName(convos: any, targetName: string): any

