import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment.development";
import { AuthService } from "./auth.service";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);
    private auth = inject(AuthService);
    private readonly API_URL = `${environment.apiUrl}/user`;

    searchUsers(username: string, page: number) {
        return this.http.get(`${this.API_URL}?username=${username}&page=${page}&size=20`, { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } });
    }

    getUsersByIds(ids: number[]): Observable<any[]> {
        const idsParam = ids.join(',');
        //return this.http.get<any[]>(`${environment.apiUrl}/user?ids=${idsParam}`);
        return  { apiUrl: `${environment.apiUrl}/user?ids=${idsParam}` } as any; 
    }   
}