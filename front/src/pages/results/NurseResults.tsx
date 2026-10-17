import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ExportButton } from '../../components/ExportButton';
import { ProgramsTable } from '../../components/ProgramsTable';
import { SessionsTable } from '../../components/SessionsTable';

/** IDE : progression des parcours de ses patients et historique des séances validées */
export function NurseResults() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') === 'historique' ? 'historique' : 'patients';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Résultats</h1>
          <p className="text-gray-500 text-sm mt-0.5">Progression des patients de vos centres et séances réalisées</p>
        </div>
        <ExportButton path="/exports/patients.xlsx" format="xlsx" label="Bilans des patients (Excel)" />
      </div>

      <Tabs value={tab} onValueChange={(value) => setParams((current) => { current.set('onglet', value); return current; }, { replace: true })}>
        <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200 rounded-none w-full justify-start gap-6">
          {[['patients', 'Mes patients'], ['historique', 'Historique des séances']].map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-1 text-sm text-gray-500 data-[state=active]:border-orange-500 data-[state=active]:text-gray-900 data-[state=active]:shadow-none data-[state=active]:bg-transparent">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="patients" className="mt-5"><ProgramsTable /></TabsContent>
        <TabsContent value="historique" className="mt-5"><SessionsTable status="validee" /></TabsContent>
      </Tabs>
    </div>
  );
}
