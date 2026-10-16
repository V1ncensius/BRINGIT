import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Avatar from '../../components/ui/Avatar';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { ErrorState, LoadingBlock } from '../../components/ui/States';
import { useAsync, useAction } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { teamService } from '../../services/teamService';
import { sportService } from '../../services/sportService';
import { authService } from '../../services/authService';
import { CITIES, LEVELS } from '../../config/constants';
import { num } from '../../lib/format';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const joined = (d) => {
  const x = new Date(d);
  return `Bergabung ${BULAN[x.getMonth()]} ${x.getFullYear()}`;
};

const toForm = (t) => ({
  team_name: t.team_name,
  primary_sport: t.primary_sport_name,
  level: t.level,
  city: t.city,
  players: t.players ? `${t.players}` : '',
  venue: t.venue || '',
  schedule: t.schedule || '',
  about: t.about || '',
  sports: t.sport_names,
  roster: t.roster?.length ? t.roster : [{ name: '', position: '', number: '' }],
});

/** UC-03 Membuat dan memperbarui profil tim (FR-02) */
export default function TeamProfile() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [busy, run] = useAction(toast);
  const team = useAsync(() => teamService.getMine(), []);
  const sports = useAsync(() => sportService.listActive(), []);
  const [tab, setTab] = useState('olahraga');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [account, setAccount] = useState(null);
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const fileRef = useRef(null);

  useEffect(() => {
    if (team.data) {
      setForm(toForm(team.data));
      setAccount({ name: team.data.captain, email: team.data.email, phone: team.data.phone });
    }
  }, [team.data]);

  if (team.loading || !form) return <LoadingBlock rows={4} />;
  if (team.error) return <ErrorState error={team.error} onRetry={team.reload} />;
  const t = team.data;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const e = {};
    if (!form.team_name.trim()) e.team_name = 'Nama tim wajib diisi.';
    if (!form.city) e.city = 'Kota wajib dipilih.';
    if (!form.sports.length) e.sports = 'Pilih minimal satu cabang olahraga.';
    if (form.players && !(Number.parseInt(form.players, 10) >= 0)) e.players = 'Isi dengan angka.';
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Data wajib belum lengkap.', 'error');
      return;
    }
    const res = await run('save', () => teamService.updateMine({ ...form, players: Number.parseInt(form.players, 10) || 0 }), {
      onError: (err) => setErrors(err.errors || {}),
    });
    if (res) {
      team.reload();
      refresh();
    }
  };

  const removeSport = (name) => setForm((f) => ({ ...f, sports: f.sports.filter((s) => s !== name), primary_sport: f.primary_sport === name ? f.sports.find((s) => s !== name) || '' : f.primary_sport }));
  const addSport = (name) => {
    if (name) setForm((f) => ({ ...f, sports: [...new Set([...f.sports, name])] }));
    setAdding(false);
  };

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) return toast('Format logo harus PNG, JPG, atau WEBP.', 'error');
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran logo maksimal 2 MB.', 'error');
    const reader = new FileReader();
    reader.onload = async () => {
      const ok = await run('logo', () => teamService.uploadLogo(reader.result), { success: 'Logo tim diperbarui.' });
      if (ok) team.reload();
    };
    reader.readAsDataURL(file);
  };

  const saveAccount = async () => {
    const ok = await run('account', () => teamService.updateAccount(account), { success: 'Profil akun disimpan.' });
    if (ok) refresh();
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) return toast('Konfirmasi kata sandi baru tidak sama.', 'error');
    const ok = await run('pwd', () => authService.changePassword(pwd.current_password, pwd.new_password));
    if (ok) setPwd({ current_password: '', new_password: '', confirm: '' });
  };

  const availableToAdd = (sports.data || []).map((s) => s.name).filter((n) => !form.sports.includes(n));
  const setRoster = (i, k, v) => setForm((f) => ({ ...f, roster: f.roster.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));

  const actions = (
    <div className="mt-7 flex flex-col gap-3 border-t border-ink-600 pt-6 sm:flex-row">
      <Button onClick={save} loading={busy === 'save'}>
        Simpan perubahan
      </Button>
      <button className="btn-secondary" onClick={() => { setForm(toForm(t)); setErrors({}); }}>
        Batal
      </button>
    </div>
  );

  return (
    <>
      <PageHeader title="Profil tim" subtitle="Identitas yang jelas membantu tim lain mengenal permainanmu." />

      <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={t.team_name} src={t.logo} tone="brand" size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold sm:text-[28px]">{t.team_name}</h2>
            {t.verified && <span className="badge-ok px-2.5 py-1.5 text-[13px]">Terverifikasi</span>}
          </div>
          <p className="mt-1.5 text-base text-muted">
            {t.city} · {joined(t.joined)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.sport_names.map((s) => (
              <span key={s} className="badge-neutral px-2.5 py-1.5 text-[13px]">{s}</span>
            ))}
            <span className="badge-neutral px-2.5 py-1.5 text-[13px]">{t.level}</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onLogo} />
        <Button variant="secondary" size="lg" onClick={() => fileRef.current?.click()} loading={busy === 'logo'}>
          Ubah logo
        </Button>
      </section>

      <Tabs
        className="mt-8"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'tim', label: 'Profil tim' },
          { value: 'olahraga', label: 'Profil olahraga' },
          { value: 'akun', label: 'Akun & keamanan' },
        ]}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_350px]">
        <div className="card card-pad">
          {tab === 'olahraga' && (
            <>
              <h2 className="card-title mb-6">Edit profil olahraga</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Select label="Cabang utama" value={form.primary_sport} onChange={set('primary_sport')}>
                  {form.sports.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <Select label="Level bermain" value={form.level} onChange={set('level')}>
                  {LEVELS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
                <Select label="Kota" value={form.city} onChange={set('city')} error={errors.city}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Input label="Jumlah pemain" inputMode="numeric" value={form.players} onChange={set('players')} error={errors.players} placeholder="12" />
                <Input label="Lapangan pilihan" wrapClass="sm:col-span-2" value={form.venue} onChange={set('venue')} placeholder="GOR C-Tra Arena, Bandung" />
                <Input label="Jadwal latihan / sparring" wrapClass="sm:col-span-2" value={form.schedule} onChange={set('schedule')} placeholder="Sabtu & Minggu · 18.00–21.00 WIB" />
                <Textarea label="Tentang tim" wrapClass="sm:col-span-2" rows={1} value={form.about} onChange={set('about')} />
              </div>

              <p className="label mt-6">Cabang olahraga aktif</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {form.sports.map((s) => (
                  <span key={s} className={s === form.primary_sport ? 'badge-brand px-2.5 py-1.5 text-[13px]' : 'badge-neutral px-2.5 py-1.5 text-[13px]'}>
                    {s}
                    <button onClick={() => removeSport(s)} aria-label={`Hapus ${s}`} className="ml-1 opacity-80 hover:opacity-100">
                      <X size={13} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
                {adding ? (
                  <select autoFocus className="select w-auto py-2 text-sm" defaultValue="" onChange={(e) => addSport(e.target.value)} onBlur={() => setAdding(false)}>
                    <option value="" disabled>Pilih cabang…</option>
                    {availableToAdd.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                ) : (
                  availableToAdd.length > 0 && (
                    <button onClick={() => setAdding(true)} className="btn-secondary btn-sm py-2">
                      <Plus size={15} /> Tambah cabang
                    </button>
                  )
                )}
              </div>
              {errors.sports ? <p className="field-error">{errors.sports}</p> : <p className="hint">Level dan ELO dicatat terpisah untuk setiap cabang olahraga.</p>}
              {actions}
            </>
          )}

          {tab === 'tim' && (
            <>
              <h2 className="card-title mb-6">Identitas &amp; daftar pemain</h2>
              <Input label="Nama tim" value={form.team_name} onChange={set('team_name')} error={errors.team_name} />
              <Textarea label="Tentang tim" wrapClass="mt-5" rows={3} value={form.about} onChange={set('about')} />
              <p className="label mt-6">Daftar pemain</p>
              <div className="space-y-3">
                {form.roster.map((r, i) => (
                  <div key={i} className="grid grid-cols-[64px_1fr_44px] gap-2 border-b border-ink-600 pb-3 sm:grid-cols-[72px_1fr_160px_44px] sm:border-0 sm:pb-0">
                    <input className="input" aria-label="Nomor punggung" placeholder="No." value={r.number ?? ''} onChange={(e) => setRoster(i, 'number', e.target.value)} />
                    <input className="input" aria-label="Nama pemain" placeholder="Nama pemain" value={r.name} onChange={(e) => setRoster(i, 'name', e.target.value)} />
                    <input className="input order-last col-span-3 sm:order-none sm:col-span-1" aria-label="Posisi" placeholder="Posisi" value={r.position} onChange={(e) => setRoster(i, 'position', e.target.value)} />
                    <button onClick={() => setForm((f) => ({ ...f, roster: f.roster.filter((_, j) => j !== i) }))} className="btn-ghost px-0" aria-label="Hapus pemain">
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setForm((f) => ({ ...f, roster: [...f.roster, { name: '', position: '', number: '' }] }))} className="btn-secondary btn-sm mt-4">
                <Plus size={15} /> Tambah pemain
              </button>
              {actions}
            </>
          )}

          {tab === 'akun' && (
            <form onSubmit={changePassword}>
              <h2 className="card-title mb-6">Ubah kata sandi</h2>
              <div className="grid gap-5 sm:max-w-md">
                <Input label="Kata sandi saat ini" type="password" autoComplete="current-password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} />
                <Input label="Kata sandi baru" type="password" autoComplete="new-password" hint="Minimal 8 karakter, termasuk huruf dan angka." value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} />
                <Input label="Konfirmasi kata sandi baru" type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
              </div>
              <Button type="submit" className="mt-6" loading={busy === 'pwd'}>
                Perbarui kata sandi
              </Button>
              <p className="hint mt-4">Sesi login memakai token (JWT). Setelah mengganti kata sandi, perangkat lain perlu masuk ulang.</p>
            </form>
          )}
        </div>

        <div className="space-y-6">
          <div className="card card-pad">
            <h2 className="card-title mb-6">Profil akun</h2>
            <div className="space-y-5">
              <Input label="Nama kapten" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
              <Input label="Email" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
              <Input label="Nomor WhatsApp" type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
            </div>
            <Button variant="secondary" className="mt-5" onClick={saveAccount} loading={busy === 'account'}>
              Simpan akun
            </Button>
            <p className="mt-4 text-[13px] text-muted">Email terverifikasi · Ubah kata sandi di Akun &amp; keamanan.</p>
          </div>

          <div className="card card-pad">
            <h2 className="card-title mb-2">Ringkasan olahraga</h2>
            {t.summary.map((s, i) => (
              <div key={s.sport} className={i ? 'border-t border-ink-600 pt-4' : 'pt-3'}>
                <div className="flex items-baseline justify-between">
                  <span className="text-base text-zinc-100">{s.sport}</span>
                  <span className="text-base font-bold text-white">{num(s.elo)} ELO</span>
                </div>
                <p className="mb-4 mt-2.5 text-[15px] text-muted">
                  {s.played} pertandingan · {s.win_rate}% kemenangan
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
