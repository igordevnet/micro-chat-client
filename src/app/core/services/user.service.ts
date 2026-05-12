import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { AuthService } from "./auth.service";
import { HttpClient } from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/user`;

    searchUsers(username: string, page: number) {
        return this.http.get(`${this.API_URL}?username=${username}&page=${page}&size=20`, { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } });
    }
}