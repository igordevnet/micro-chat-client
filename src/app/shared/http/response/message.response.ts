import { UUID } from "crypto";
import { AttachmentResponse } from "./attachment.response";

export interface MessageResponse {
    id: string;
    senderId: number;
    chatId: UUID;
    createdAt: Date;
    content: string;
    edited: boolean;
    messageType: string;
    actionType: string;
    attachment: AttachmentResponse;
}