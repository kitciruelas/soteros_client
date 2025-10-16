export interface Alert {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'sent' | 'active' | 'resolved';
  recipients: string[];
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  location_text?: string;
  created_at: string;
  sent_at?: string;
}
