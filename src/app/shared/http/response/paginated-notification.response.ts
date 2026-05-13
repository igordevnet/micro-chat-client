import { NotificationResponse } from "./notification.response";

export interface NotificationPaginatedResponse {
    content: NotificationResponse[];
    currentPage: number;
    totalPages: number;
    totalElements: number;
}