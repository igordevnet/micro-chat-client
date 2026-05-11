import { UUID } from "crypto";

export interface Chat {
    id: UUID;
    chatName: string;
    type: string;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date;
    lastMessagePreview: string;
    participants: any;
}