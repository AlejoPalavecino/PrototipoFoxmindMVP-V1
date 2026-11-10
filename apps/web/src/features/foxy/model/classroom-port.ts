export interface Classroom {
 id: string; name: string; subject: string; division: string; academicYear: number; timezone: string; coverKey: string; archived: boolean; teacher: string; role: 'teacher' | 'student'; revision: string;
}
export interface Detail extends Classroom {
 units: { id?: string; name: string; topics: { id?: string; name: string; status?: string }[] }[];
 plans: { id: string; fileId: string; version: number }[];
}
export interface FoxyClassroomReadPort {
 call<T>(path: string, method?: string, body?: unknown, signal?: AbortSignal): Promise<T>;
}
