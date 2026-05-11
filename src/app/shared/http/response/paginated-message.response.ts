import { MessageResponse } from "./message.response";

export interface PaginatedMessage {
    content: MessageResponse[];
    currentPage: number;
    totalPages: number;
    totalElements: number;
}