

export interface Topic {
  id?: string;
  name: string;
  status?: string;
}

export interface Unit {
  id?: string;
  name: string;
  topics: Topic[];
}
