import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  buscarConfiguracaoEscola,
  salvarConfiguracaoEscola,
  type ConfiguracaoEscola,
} from "../services/EscolaService";

interface EscolaContextValue {
  config: ConfiguracaoEscola;
  carregando: boolean;
  salvar: (novaConfig: ConfiguracaoEscola) => Promise<void>;
  recarregar: () => Promise<void>;
}

const EscolaContext = createContext<EscolaContextValue>({
  config: { nome: "Minha Escola", documento: "", logo_b64: null },
  carregando: true,
  salvar: async () => {},
  recarregar: async () => {},
});

export function EscolaProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfiguracaoEscola>({
    nome: "Minha Escola",
    documento: "",
    logo_b64: null,
  });
  const [carregando, setCarregando] = useState(true);

  const recarregar = async () => {
    setCarregando(true);
    try {
      const dados = await buscarConfiguracaoEscola();
      setConfig(dados);
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async (novaConfig: ConfiguracaoEscola) => {
    await salvarConfiguracaoEscola(novaConfig);
    setConfig(novaConfig);
  };

  useEffect(() => {
    recarregar();
  }, []);

  return (
    <EscolaContext.Provider value={{ config, carregando, salvar, recarregar }}>
      {children}
    </EscolaContext.Provider>
  );
}

export function useEscolaConfig(): EscolaContextValue {
  return useContext(EscolaContext);
}
