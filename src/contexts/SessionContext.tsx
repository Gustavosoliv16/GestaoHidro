import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { registrarLogin, registrarLogout } from "../services/FuncionarioService";

export interface SessaoFuncionario {
  id_funcionario: number;
  nome: string;
}

interface SessionContextValue {
  sessao: SessaoFuncionario | null;
  logado: boolean;
  login: (funcionario: SessaoFuncionario) => Promise<void>;
  logout: () => Promise<void>;
}

const SESSION_KEY = "sessao_funcionario";

const SessionContext = createContext<SessionContextValue>({
  sessao: null,
  logado: false,
  login: async () => {},
  logout: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<SessaoFuncionario | null>(() => {
    try {
      const salvo = sessionStorage.getItem(SESSION_KEY);
      return salvo ? (JSON.parse(salvo) as SessaoFuncionario) : null;
    } catch {
      return null;
    }
  });

  // Sincroniza sessionStorage sempre que a sessão muda
  useEffect(() => {
    if (sessao) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [sessao]);

  const login = async (funcionario: SessaoFuncionario) => {
    setSessao(funcionario);
    await registrarLogin(funcionario.id_funcionario, funcionario.nome);
  };

  const logout = async () => {
    if (sessao) {
      await registrarLogout(sessao.id_funcionario, sessao.nome);
    }
    setSessao(null);
  };

  return (
    <SessionContext.Provider
      value={{ sessao, logado: sessao !== null, login, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
