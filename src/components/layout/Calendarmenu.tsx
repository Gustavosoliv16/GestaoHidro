import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { addLocale, locale } from "primereact/api";

addLocale("pt-BR", {
  firstDayOfWeek: 1,
  dayNames: [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ],
  dayNamesShort: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"],
  dayNamesMin: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  monthNames: [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ],
  monthNamesShort: [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ],
  today: "Hoje",
  clear: "Limpar",
});
locale("pt-BR");

interface CalendarioLateralProps {
  dataSelecionada: Date | null;
  aoMudarData: (data: Date) => void;
}

export default function CalendarioLateral({
  dataSelecionada,
  aoMudarData,
}: CalendarioLateralProps) {
  const opcoesHoras = Array.from({ length: 18 }, (_, i) => {
    const hora = i + 6;
    const horaFormatada = hora.toString().padStart(2, "0");
    return { label: `${horaFormatada} h`, value: hora };
  });

  const horaDoEstado = dataSelecionada ? dataSelecionada.getHours() : 6;
  const horaAtual = horaDoEstado < 6 ? 6 : horaDoEstado;

  const aoMudarHora = (novaHora: number) => {
    if (dataSelecionada) {
      const novaData = new Date(dataSelecionada);
      novaData.setHours(novaHora);
      aoMudarData(novaData);
    }
  };

  const aoMudarDiaCalendario = (e: any) => {
    if (e.value) {
      const novaData = new Date(e.value);
      novaData.setHours(horaAtual);
      aoMudarData(novaData);
    }
  };

  return (
    <div className="card surface-card border-1 surface-border p-0">
      <div className="p-3">
        <Calendar
          value={dataSelecionada}
          onChange={aoMudarDiaCalendario}
          disabledDays={[0]}
          inline
          locale="pt-BR"
          dateFormat="dd/mm/yy"
          className="w-full custom-calendar"
        />
      </div>
      <div className="border-top-1 surface-border py-3 px-3">
        <label className="font-semibold text-sm text-900 flex align-items-center gap-2 mb-2">
          <i className="pi pi-clock text-primary"></i> Selecione o Horário
        </label>
        <Dropdown
          appendTo={document.body}
          value={horaAtual}
          options={opcoesHoras}
          onChange={(e) => aoMudarHora(e.value)}
          placeholder="Hora"
          className="w-full"
          scrollHeight="200px"
        />
      </div>
    </div>
  );
}
