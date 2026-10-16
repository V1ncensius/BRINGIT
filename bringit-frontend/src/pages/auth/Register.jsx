import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, Check, ShieldCheck, Users } from 'lucide-react';
import { Input, Select } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CITIES } from '../../config/constants';
import { IS_PROGRESS30 } from '../../config/features';
import { cx } from '../../lib/format';

const ROLES = [
  { value: 'team', label: 'Tim', desc: 'Cari lawan', icon: Users, cta: 'Buat akun tim' },
  { value: 'referee', label: 'Wasit', desc: 'Pimpin laga', icon: ShieldCheck, cta: 'Daftar sebagai wasit' },
  { value: 'photographer', label: 'Fotografer', desc: 'Abadikan laga', icon: Camera, cta: 'Daftar sebagai fotografer' },
];

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/** UC-01 (tim), UC-12 (wasit), UC-15 (fotografer). Mode progress30: hanya peran Tim. */
export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const VISIBLE_ROLES = IS_PROGRESS30 ? ROLES.filter((r) => r.value === 'team') : ROLES;
  const [role, setRole] = useState('team');
  const [form, setForm] = useState({ name: '', team_name: '', email: '', phone: '', city: 'Bandung', password: '', confirm: '', agree: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const current = ROLES.find((r) => r.value === role);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nama lengkap wajib diisi.';
    if (role === 'team' && !form.team_name.trim()) e.team_name = 'Nama tim wajib diisi.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Format email tidak valid.';
    if (form.phone && !/^[0-9+\s-]{9,16}$/.test(form.phone)) e.phone = 'Nomor HP tidak valid.';
    if (!PASSWORD_RULE.test(form.password)) e.password = 'Minimal 8 karakter, termasuk huruf dan angka.';
    if (form.confirm !== form.password) e.confirm = 'Konfirmasi kata sandi tidak sama.';
    if (!form.agree) e.agree = 'Anda perlu menyetujui ketentuan layanan.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await register({ role, name: form.name, team_name: form.team_name, email: form.email, phone: form.phone, city: form.city, password: form.password });
      toast(role === 'team' ? res.message : 'Pendaftaran terkirim. Lengkapi profil jasa — admin akan memverifikasi akun Anda.', 'success');
      nav(role === 'team' ? '/tim/profil' : '/penyedia/profil', { replace: true });
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="eyebrow">Mulai perjalananmu</p>
      <h1 className="mt-3 text-[34px] font-bold leading-tight sm:text-[38px]">Satu lapangan. Banyak peran.</h1>
      <p className="mt-3 text-base text-muted">{IS_PROGRESS30 ? 'Buat akun tim untuk mencari lawan sparring.' : 'Bergabung sebagai tim atau penyedia jasa olahraga.'}</p>

      <form onSubmit={submit} noValidate className="mt-8">
        {!IS_PROGRESS30 && (
        <fieldset>
          <legend className="label">Saya ingin bergabung sebagai</legend>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {VISIBLE_ROLES.map((r) => {
              const Icon = r.icon;
              const active = r.value === role;
              return (
                <label key={r.value} className={cx('cursor-pointer rounded-lg border p-3 transition-colors sm:p-3.5', active ? 'border-brand bg-brand-soft' : 'border-ink-600 bg-ink-800 hover:border-ink-500')}>
                  <input type="radio" name="role" value={r.value} checked={active} onChange={() => setRole(r.value)} className="sr-only" />
                  <Icon size={20} className={active ? 'text-brand' : 'text-zinc-300'} strokeWidth={1.8} />
                  <span className="mt-2 block text-[15px] font-semibold text-white">{r.label}</span>
                  <span className="mt-1 block text-xs text-muted">{r.desc}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Input label="Nama lengkap" autoComplete="name" placeholder="Rizky Ramadhan" value={form.name} onChange={set('name')} error={errors.name} />
          {role === 'team' ? (
            <Input label="Nama tim" placeholder="Garuda United" value={form.team_name} onChange={set('team_name')} error={errors.team_name} />
          ) : (
            <Select label="Kota layanan" value={form.city} onChange={set('city')}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
          <Input label="Email" type="email" autoComplete="email" placeholder="kapten@timkamu.id" value={form.email} onChange={set('email')} error={errors.email} wrapClass="sm:col-span-2" />
          <Input label="Nomor HP / WhatsApp" type="tel" autoComplete="tel" placeholder="0812 3456 7890" value={form.phone} onChange={set('phone')} error={errors.phone} wrapClass="sm:col-span-2" />
          <Input label="Kata sandi" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          <Input label="Konfirmasi kata sandi" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        </div>
        {!errors.password && <p className="hint">Minimal 8 karakter, termasuk huruf dan angka.</p>}

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-zinc-300">
          <span className="relative mt-px grid h-5 w-5 shrink-0 place-items-center">
            <input type="checkbox" checked={form.agree} onChange={set('agree')} className="peer absolute inset-0 cursor-pointer appearance-none rounded border border-ink-500 bg-ink-900 checked:border-brand checked:bg-brand" />
            <Check size={14} strokeWidth={3} className="pointer-events-none relative hidden text-ink-950 peer-checked:block" />
          </span>
          Saya menyetujui Ketentuan Layanan dan Kebijakan Privasi Bringit.
        </label>
        {errors.agree && <p className="field-error">{errors.agree}</p>}

        <Button type="submit" loading={busy} size="lg" className="mt-7 w-full">
          {current.cta}
        </Button>
        <p className="mt-4 text-[13px] text-muted">{IS_PROGRESS30 ? 'Akun tim langsung aktif setelah daftar.' : 'Akun diverifikasi melalui email. Wasit & fotografer melengkapi profil jasa setelah mendaftar.'}</p>
      </form>

      <p className="mt-7 text-[15px] text-muted">
        Sudah punya akun?{' '}
        <Link to="/masuk" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
          Masuk <ArrowRight size={15} />
        </Link>
      </p>
    </>
  );
}
