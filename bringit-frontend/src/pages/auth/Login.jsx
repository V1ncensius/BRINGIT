import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CircleAlert } from 'lucide-react';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { USE_MOCK } from '../../services/apiClient';
import { ROLE_HOME } from '../../config/constants';

const DEMO = [
  ['Tim', 'kapten@garudaunited.id'],
  ['Wasit', 'andi@bringit.id'],
  ['Fotografer', 'bima@bringit.id'],
  ['Admin', 'admin@bringit.id'],
];

/** UC-02 Masuk ke akun */
export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Masukkan email yang valid.';
    if (!form.password) errs.password = 'Kata sandi wajib diisi.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert(null);
    try {
      const u = await login(form.email.trim(), form.password, form.remember);
      nav(loc.state?.from || ROLE_HOME[u.role] || '/', { replace: true });
    } catch (err) {
      setAlert({ message: err.message, unverified: err.errors?.code === 'UNVERIFIED' });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    await authService.resendVerification(form.email).catch(() => {});
    toast('Tautan verifikasi dikirim ulang ke email Anda.', 'info');
  };

  const sendReset = async () => {
    try {
      const r = await authService.forgotPassword(forgotEmail);
      toast(r.message, 'info');
      setForgot(false);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <p className="eyebrow">Selamat datang di Bringit</p>
      <h1 className="mt-3 text-[34px] font-bold leading-tight sm:text-[38px]">Siap kembali ke lapangan?</h1>
      <p className="mt-3 text-base text-muted">Masuk untuk mengatur pertandingan berikutnya.</p>

      {alert && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            {alert.message}
            {alert.unverified && (
              <button onClick={resend} className="mt-1 block font-semibold underline">
                Kirim ulang tautan verifikasi
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-8 space-y-6">
        <Input label="Email" type="email" autoComplete="email" placeholder="nama@tim.id" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Kata sandi" type="password" autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={set('password')} error={errors.password} />
        <div className="flex items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-[15px] text-zinc-200">
            <span className="relative grid h-5 w-5 place-items-center">
              <input type="checkbox" checked={form.remember} onChange={set('remember')} className="peer absolute inset-0 cursor-pointer appearance-none rounded border border-ink-500 bg-ink-900 checked:border-brand checked:bg-brand" />
              <Check size={14} strokeWidth={3} className="pointer-events-none relative hidden text-ink-950 peer-checked:block" />
            </span>
            Ingat saya
          </label>
          <button type="button" onClick={() => { setForgotEmail(form.email); setForgot(true); }} className="text-[15px] text-brand hover:underline">
            Lupa kata sandi?
          </button>
        </div>
        <Button type="submit" loading={busy} size="lg" className="w-full">
          Masuk
        </Button>
      </form>

      <p className="mt-8 text-[15px] text-muted">
        Belum punya akun?{' '}
        <Link to="/daftar" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          Daftar sekarang <ArrowRight size={15} />
        </Link>
      </p>

      {USE_MOCK && (
        <div className="mt-8 rounded-lg border border-dashed border-ink-500 p-4">
          <p className="text-[13px] font-semibold text-zinc-200">Akun demo (mock API) · kata sandi: bringit123</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO.map(([role, email]) => (
              <button key={email} type="button" onClick={() => setForm((f) => ({ ...f, email, password: 'bringit123' }))} className="badge-neutral px-2.5 py-1.5 hover:bg-ink-600">
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={forgot}
        onClose={() => setForgot(false)}
        title="Atur ulang kata sandi"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setForgot(false)}>Batal</button>
            <button className="btn-primary" onClick={sendReset}>Kirim tautan</button>
          </>
        }
      >
        <p className="mb-4 text-sm text-muted">Kami akan mengirim tautan atur ulang kata sandi ke email Anda.</p>
        <Input label="Email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
      </Modal>
    </>
  );
}
