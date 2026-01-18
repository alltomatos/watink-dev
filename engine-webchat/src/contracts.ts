export interface Envelope {
    id: string;
    timestamp: number;
    tenantId: string | number;
    type: string;
    payload: any;
}

export interface WebchatMessagePayload {
    ticketId: number;
    contactId: number;
    body: string;
    fromMe: boolean;
}

export interface WebchatTicketPayload {
    ticketId: number;
    contactId: number;
    webchatId: number;
}
