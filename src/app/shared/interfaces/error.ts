import { ValidationError } from "./validation.error";

export interface ApiError {
    error: string;
    timestamp: string;
    status: number;
    path: string;
    errors: ValidationError[];
}