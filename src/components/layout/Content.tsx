import "primereact/resources/themes/saga-blue/theme.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import { Card } from "primereact/card";
import { Button } from "primereact/button";

export default function Content() {
  return (
    <div className="flex align-items-center justify-content-center p-4 surface-ground min-h-screen">
      <Card
        className="surface-card border-1 surface-border p-0 w-full"
        style={{ maxWidth: "600px" }}
      >
        <div className="p-4">
          <h1 className="text-3xl font-bold mb-3 mt-0 text-900">
            Bem-vindo ao Sistema de Gestão
          </h1>
          <p className="text-600 mb-4 line-height-3">
            Este é o conteúdo principal da página. Aqui você pode adicionar
            gráficos, tabelas, ou qualquer outra informação relevante para o
            usuário.
          </p>
          <Button label="Saiba Mais" className="p-button-outlined" />
        </div>
      </Card>
    </div>
  );
}
