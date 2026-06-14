import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Lock, Loader2, LogOut, Plus, Trash2, Pencil, ExternalLink, X, Check,
  ImagePlus, ShieldCheck, AlertTriangle, ArrowRight,
} from "lucide-react";

interface ClientRow {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt?: string;
}

const MAX_LOGO_BYTES = 700 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("read error"));
    fr.readAsDataURL(file);
  });
}

export function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  // login form
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then(r => r.json())
      .then(d => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setLoggingIn(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
        setPassword("");
      } else {
        const d = await res.json().catch(() => ({}));
        setLoginErr(d.error || "كلمة المرور غير صحيحة");
      }
    } catch {
      setLoginErr("تعذر الاتصال بالخادم");
    } finally {
      setLoggingIn(false);
    }
  };

  if (checking) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50"
        style={{ fontFamily: "'Tajawal', sans-serif" }}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-5"
        style={{ fontFamily: "'Tajawal', sans-serif" }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-slate-900">لوحة الإدارة</h1>
            <p className="mt-1 text-sm text-slate-500">أدخل كلمة المرور للمتابعة</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white"
            />
            {loginErr && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                <span className="text-xs font-bold text-red-700">{loginErr}</span>
              </div>
            )}
            <button type="submit" disabled={loggingIn || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50">
              {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              دخول
            </button>
          </form>
          <Link to="/" className="mt-5 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">
            <ArrowRight className="h-3.5 w-3.5" />
            العودة للصفحة الرئيسية
          </Link>
        </motion.div>
      </div>
    );
  }

  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // edit state
  const [editId, setEditId] = useState<number | null>(null);

  const loadClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const d = await res.json();
      setClients(Array.isArray(d) ? d : []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    onLogout();
  };

  const pickLogo = async (file: File | undefined, setter: (v: string | null) => void) => {
    setFormErr(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setFormErr("صيغة الشعار يجب أن تكون PNG أو JPG أو WEBP أو SVG");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setFormErr("حجم الشعار يتجاوز الحد المسموح (700 كيلوبايت)");
      return;
    }
    try {
      setter(await fileToDataUrl(file));
    } catch {
      setFormErr("تعذر قراءة ملف الشعار");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!name.trim()) { setFormErr("اسم العميل مطلوب"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() || undefined, logoUrl: logo }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFormErr(d.error || "تعذر إنشاء العميل");
        return;
      }
      setName(""); setSlug(""); setLogo(null);
      await loadClients();
    } catch {
      setFormErr("تعذر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: ClientRow) => {
    if (!window.confirm(`حذف العميل "${c.name}" وكل بياناته؟ لا يمكن التراجع.`)) return;
    const res = await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
    if (res.ok) loadClients();
    else window.alert("تعذر حذف العميل");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50" style={{ fontFamily: "'Tajawal', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-lg">
              <span className="text-base font-black text-white">م</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-slate-900">لوحة الإدارة</p>
              <p className="text-[10px] font-bold text-slate-400">إدارة العملاء والبيانات</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-blue-300 hover:text-blue-700">
              عرض الموقع
            </Link>
            <button onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100">
              <LogOut className="h-3.5 w-3.5" />
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {/* Create client */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-base font-black text-slate-900">إضافة عميل جديد</h2>
          </div>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">اسم العميل *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: مطاعم المركزية"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-500">المعرّف (اختياري)</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="markazia" dir="ltr"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition-all focus:border-blue-400 focus:bg-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-500">الشعار (اختياري — حد أقصى 700 كيلوبايت)</label>
              <div className="flex items-center gap-3">
                {logo ? (
                  <div className="relative">
                    <img src={logo} alt="logo" className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200" />
                    <button type="button" onClick={() => setLogo(null)}
                      className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition-all hover:border-blue-400 hover:text-blue-500">
                    <ImagePlus className="h-5 w-5" />
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                      onChange={e => pickLogo(e.target.files?.[0], setLogo)} />
                  </label>
                )}
                <span className="text-xs text-slate-400">PNG · JPG · WEBP · SVG</span>
              </div>
            </div>
            {formErr && (
              <div className="sm:col-span-2 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-500" />
                <span className="text-xs font-bold text-red-700">{formErr}</span>
              </div>
            )}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-500 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                إضافة العميل
              </button>
            </div>
          </form>
        </div>

        {/* Clients list */}
        <div className="mt-8">
          <h2 className="mb-4 text-base font-black text-slate-900">العملاء ({clients.length})</h2>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm font-bold text-slate-400">
              لا يوجد عملاء — أضف أول عميل من الأعلى.
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map(c =>
                editId === c.id ? (
                  <EditRow key={c.id} client={c}
                    onCancel={() => setEditId(null)}
                    onSaved={() => { setEditId(null); loadClients(); }}
                    pickLogo={pickLogo} />
                ) : (
                  <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <span className="text-lg font-black text-slate-500">{c.name.trim().charAt(0) || "؟"}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">{c.name}</p>
                      <p className="truncate text-xs font-bold text-slate-400" dir="ltr">/{c.slug}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Link to={`/${encodeURIComponent(c.slug)}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:border-blue-300 hover:text-blue-700">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">فتح اللوحة</span>
                      </Link>
                      <button onClick={() => { setFormErr(null); setEditId(c.id); }}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition-all hover:border-amber-300 hover:text-amber-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 p-2 text-red-500 transition-all hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EditRow({
  client, onCancel, onSaved, pickLogo,
}: {
  client: ClientRow;
  onCancel: () => void;
  onSaved: () => void;
  pickLogo: (file: File | undefined, setter: (v: string | null) => void) => Promise<void>;
}) {
  const [name, setName] = useState(client.name);
  const [slug, setSlug] = useState(client.slug);
  const [logo, setLogo] = useState<string | null>(client.logoUrl);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!name.trim()) { setErr("الاسم مطلوب"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), logoUrl: logo }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "تعذر التحديث");
        return;
      }
      onSaved();
    } catch {
      setErr("تعذر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          {logo ? (
            <div className="relative">
              <img src={logo} alt="logo" className="h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200" />
              <button type="button" onClick={() => setLogo(null)}
                className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white text-slate-400 hover:border-blue-400">
              <ImagePlus className="h-4 w-4" />
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
                onChange={e => pickLogo(e.target.files?.[0], setLogo)} />
            </label>
          )}
          <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400" />
        </div>
        <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="المعرّف" dir="ltr"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400" />
      </div>
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          حفظ
        </button>
        <button onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50">
          <X className="h-3.5 w-3.5" />
          إلغاء
        </button>
      </div>
    </div>
  );
}
