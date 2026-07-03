import { useState, useRef, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { gotaBranca } from '../assets/brand';
interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');
  const [tentativas, setTentativas] = useState(0);
  const [bloqueado, setBloqueado] = useState(false);
  const [tempoBloqueio, setTempoBloqueio] = useState(0);
  const toast = useRef<Toast>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // PIN padrão (pode ser alterado nas configurações)
  const PIN_PADRAO = '1234';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (bloqueado && tempoBloqueio > 0) {
      const timer = setInterval(() => {
        setTempoBloqueio(prev => {
          if (prev <= 1) {
            setBloqueado(false);
            setTentativas(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [bloqueado, tempoBloqueio]);

  const handleLogin = () => {
    if (bloqueado) {
      toast.current?.show({
        severity: 'error',
        summary: 'Bloqueado',
        detail: `Aguarde ${tempoBloqueio} segundos antes de tentar novamente.`,
        life: 3000
      });
      return;
    }

    // Verifica PIN
    const pinSalvo = localStorage.getItem('pin_acesso') || PIN_PADRAO;
    
    if (pin === pinSalvo) {
      localStorage.setItem('ultimo_login', new Date().toISOString());
      setErro('');
      setTentativas(0);
      toast.current?.show({
        severity: 'success',
        summary: 'Bem-vindo!',
        detail: 'Login realizado com sucesso.',
        life: 2000
      });
      setTimeout(() => onLogin(), 500);
    } else {
      const novasTentativas = tentativas + 1;
      setTentativas(novasTentativas);
      setPin('');
      
      if (novasTentativas >= 3) {
        setBloqueado(true);
        setTempoBloqueio(30);
        setErro('Muitas tentativas. Bloqueado por 30 segundos.');
        toast.current?.show({
          severity: 'error',
          summary: 'Bloqueado',
          detail: 'PIN incorreto 3 vezes. Bloqueado por 30 segundos.',
          life: 3000
        });
      } else {
        setErro(`PIN incorreto. Tentativa ${novasTentativas} de 3.`);
        toast.current?.show({
          severity: 'error',
          summary: 'Erro',
          detail: 'PIN incorreto. Tente novamente.',
          life: 3000
        });
      }
      
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pin.length === 4) {
      handleLogin();
    }
  };

  return (
    <div 
      className="flex align-items-center justify-content-center"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <Toast ref={toast} />
      
      <div 
        className="card p-6 shadow-8 border-round-xl"
        style={{
          width: '400px',
          maxWidth: '90vw',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="flex flex-column align-items-center mb-5">
          <img 
            src={gotaBranca} 
            alt="Gestão Hidro" 
            style={{ 
              width: '180px', 
              height: 'auto',
              marginBottom: '1rem'
            }} 
          />
          <h2 className="text-2xl font-bold text-900 m-0">
            Gestão Hidro
          </h2>
          <p className="text-600 mt-2 mb-0">
            Digite seu PIN para acessar
          </p>
        </div>

        <div className="flex flex-column gap-3">
          <div className="p-inputgroup">
            <span className="p-inputgroup-addon">
              <i className="pi pi-lock"></i>
            </span>
            <InputText
              ref={inputRef}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={handleKeyPress}
              placeholder="••••"
              maxLength={4}
              className="p-inputtext-lg text-center"
              style={{ 
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                fontFamily: 'monospace'
              }}
              disabled={bloqueado}
            />
          </div>

          {erro && (
            <small className="text-red-500 text-center font-semibold">
              {erro}
            </small>
          )}

          {bloqueado && (
            <small className="text-orange-500 text-center">
              Desbloqueio em {tempoBloqueio}s
            </small>
          )}

          <Button
            label="Entrar"
            icon="pi pi-sign-in"
            onClick={handleLogin}
            disabled={pin.length !== 4 || bloqueado}
            className="p-button-lg mt-3"
          />

          <div className="text-center mt-4">
            <small className="text-500">
              PIN padrão: <strong>1234</strong>
              <br />
              Altere nas configurações
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
