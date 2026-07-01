import { useParams } from 'react-router-dom';
import { ReportForm } from '../components/ReportForm';

/**
 * Route per la modifica di un rapporto esistente.
 * Legge il reportId dall'URL param :id.
 */
export function ReportEditRoute() {
  const { id } = useParams<{ id: string }>();
  return <ReportForm reportId={id} />;
}
