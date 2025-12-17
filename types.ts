export interface CrewMember {
    id: string;
    name: string;
    avatar: string;
    phone: string;
    zalo: string;
    role: string;
}

export interface Assignment {
    id: string;
    trainId: string;
    date: string;
    content: string;
}

export interface IncidentReport {
    id: string;
    description: string;
    images: string[];
    pdfs: string[];
    timestamp: number;
}

export interface DocumentItem {
    id: string;
    title: string;
    date: string;
    content: string;
    type: 'general' | 'coupling'; // 'general' = Văn bản mới, 'coupling' = Cắt nối xe
    files: Array<{ name: string; url: string; type: 'pdf' | 'image' }>;
}

export type ViewState = 'home' | 'assignment' | 'briefing' | 'new-docs' | 'coupling-docs' | 'incident' | 'crew';